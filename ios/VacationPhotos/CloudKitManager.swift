import Foundation
import CloudKit
import UIKit

@objc(CloudKitManager)
class CloudKitManager: NSObject {

  private let container = CKContainer(identifier: "iCloud.com.swapp1990.vacationphotos")
  private var publicDatabase: CKDatabase {
    return container.publicCloudDatabase
  }

  // MARK: - Upload Shared Vacation

  @objc func uploadSharedVacation(
    _ shareId: String,
    locationName: String,
    startDate: Double,
    endDate: Double,
    photoCount: Int,
    sharedBy: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let record = CKRecord(recordType: "SharedVacation", recordID: CKRecord.ID(recordName: shareId))
    record["shareId"] = shareId
    record["locationName"] = locationName
    record["startDate"] = Date(timeIntervalSince1970: startDate / 1000)
    record["endDate"] = Date(timeIntervalSince1970: endDate / 1000)
    record["photoCount"] = photoCount
    record["sharedBy"] = sharedBy

    publicDatabase.save(record) { savedRecord, error in
      DispatchQueue.main.async {
        if let error = error {
          reject("UPLOAD_ERROR", "Failed to upload shared vacation: \(error.localizedDescription)", error)
        } else {
          resolve(["shareId": shareId])
        }
      }
    }
  }

  // MARK: - Upload Photo

  @objc func uploadPhoto(
    _ shareId: String,
    photoPath: String,
    orderIndex: Int,
    width: Int,
    height: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let fileURL = URL(fileURLWithPath: photoPath)

    guard FileManager.default.fileExists(atPath: photoPath) else {
      reject("FILE_ERROR", "Photo file not found at path: \(photoPath)", nil)
      return
    }

    let recordID = CKRecord.ID(recordName: "\(shareId)_\(orderIndex)")
    let record = CKRecord(recordType: "SharedPhoto", recordID: recordID)
    record["shareId"] = shareId
    record["orderIndex"] = orderIndex
    record["width"] = width
    record["height"] = height
    record["photoAsset"] = CKAsset(fileURL: fileURL)

    publicDatabase.save(record) { savedRecord, error in
      DispatchQueue.main.async {
        if let error = error {
          reject("UPLOAD_ERROR", "Failed to upload photo: \(error.localizedDescription)", error)
        } else {
          resolve([
            "shareId": shareId,
            "orderIndex": orderIndex,
            "success": true
          ])
        }
      }
    }
  }

  // MARK: - Fetch Shared Vacation

  @objc func fetchSharedVacation(
    _ shareId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let recordID = CKRecord.ID(recordName: shareId)

    publicDatabase.fetch(withRecordID: recordID) { record, error in
      DispatchQueue.main.async {
        if let error = error {
          if let ckError = error as? CKError, ckError.code == .unknownItem {
            reject("NOT_FOUND", "Shared vacation not found", error)
          } else {
            reject("FETCH_ERROR", "Failed to fetch shared vacation: \(error.localizedDescription)", error)
          }
          return
        }

        guard let record = record else {
          reject("NOT_FOUND", "Shared vacation not found", nil)
          return
        }

        var result: [String: Any] = [
          "shareId": shareId
        ]

        if let locationName = record["locationName"] as? String {
          result["locationName"] = locationName
        }
        if let startDate = record["startDate"] as? Date {
          result["startDate"] = startDate.timeIntervalSince1970 * 1000
        }
        if let endDate = record["endDate"] as? Date {
          result["endDate"] = endDate.timeIntervalSince1970 * 1000
        }
        if let photoCount = record["photoCount"] as? Int {
          result["photoCount"] = photoCount
        }
        if let sharedBy = record["sharedBy"] as? String {
          result["sharedBy"] = sharedBy
        }

        resolve(result)
      }
    }
  }

  // MARK: - Fetch Shared Photos

  @objc func fetchSharedPhotos(
    _ shareId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let predicate = NSPredicate(format: "shareId == %@", shareId)
    let query = CKQuery(recordType: "SharedPhoto", predicate: predicate)
    query.sortDescriptors = [NSSortDescriptor(key: "orderIndex", ascending: true)]

    publicDatabase.fetch(withQuery: query, inZoneWith: nil) { result in
      DispatchQueue.main.async {
        switch result {
        case .success(let (matchResults, _)):
          var photos: [[String: Any]] = []

          for (_, recordResult) in matchResults {
            switch recordResult {
            case .success(let record):
              var photoInfo: [String: Any] = [
                "orderIndex": record["orderIndex"] as? Int ?? 0,
                "width": record["width"] as? Int ?? 0,
                "height": record["height"] as? Int ?? 0
              ]

              if let asset = record["photoAsset"] as? CKAsset,
                 let fileURL = asset.fileURL {
                photoInfo["localPath"] = fileURL.path
              }

              photos.append(photoInfo)
            case .failure(let error):
              print("Error fetching photo record: \(error)")
            }
          }

          resolve(photos)

        case .failure(let error):
          reject("FETCH_ERROR", "Failed to fetch photos: \(error.localizedDescription)", error)
        }
      }
    }
  }

  // MARK: - Fetch Preview Photos (limited to 3)

  @objc func fetchPreviewPhotos(
    _ shareId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let predicate = NSPredicate(format: "shareId == %@", shareId)
    let query = CKQuery(recordType: "SharedPhoto", predicate: predicate)
    query.sortDescriptors = [NSSortDescriptor(key: "orderIndex", ascending: true)]

    publicDatabase.fetch(withQuery: query, inZoneWith: nil, desiredKeys: ["orderIndex", "width", "height", "photoAsset"], resultsLimit: 3) { result in
      DispatchQueue.main.async {
        switch result {
        case .success(let (matchResults, _)):
          var photos: [[String: Any]] = []

          for (_, recordResult) in matchResults {
            switch recordResult {
            case .success(let record):
              var photoInfo: [String: Any] = [
                "orderIndex": record["orderIndex"] as? Int ?? 0,
                "width": record["width"] as? Int ?? 0,
                "height": record["height"] as? Int ?? 0
              ]

              if let asset = record["photoAsset"] as? CKAsset,
                 let fileURL = asset.fileURL {
                photoInfo["localPath"] = fileURL.path
              }

              photos.append(photoInfo)
            case .failure(let error):
              print("Error fetching preview photo: \(error)")
            }
          }

          resolve(photos)

        case .failure(let error):
          reject("FETCH_ERROR", "Failed to fetch preview photos: \(error.localizedDescription)", error)
        }
      }
    }
  }

  // MARK: - Check CloudKit Availability

  @objc func checkAvailability(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    container.accountStatus { status, error in
      DispatchQueue.main.async {
        if let error = error {
          reject("CHECK_ERROR", "Failed to check CloudKit status: \(error.localizedDescription)", error)
          return
        }

        var statusString: String
        var available = false

        switch status {
        case .available:
          statusString = "available"
          available = true
        case .noAccount:
          statusString = "noAccount"
        case .restricted:
          statusString = "restricted"
        case .couldNotDetermine:
          statusString = "couldNotDetermine"
        case .temporarilyUnavailable:
          statusString = "temporarilyUnavailable"
        @unknown default:
          statusString = "unknown"
        }

        resolve([
          "status": statusString,
          "available": available
        ])
      }
    }
  }
}
