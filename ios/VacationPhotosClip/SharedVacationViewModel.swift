import Foundation
import CloudKit
import Combine

enum LoadingState {
    case loading
    case loaded
    case error(String)
}

@MainActor
class SharedVacationViewModel: ObservableObject {
    @Published var vacation: SharedVacation?
    @Published var photos: [SharedPhoto] = []
    @Published var state: LoadingState = .loading

    private let container = CKContainer(identifier: "iCloud.com.swapp1990.vacationphotos")
    private var publicDatabase: CKDatabase {
        container.publicCloudDatabase
    }

    func loadVacation(shareId: String) {
        state = .loading
        vacation = nil
        photos = []

        Task {
            do {
                // Fetch vacation metadata
                let vacationRecord = try await fetchVacationRecord(shareId: shareId)
                let loadedVacation = parseVacation(from: vacationRecord, shareId: shareId)
                self.vacation = loadedVacation

                // Fetch photos
                let photoRecords = try await fetchPhotoRecords(shareId: shareId)
                self.photos = photoRecords.map { parsePhoto(from: $0) }

                self.state = .loaded
            } catch {
                self.state = .error(error.localizedDescription)
            }
        }
    }

    private func fetchVacationRecord(shareId: String) async throws -> CKRecord {
        let recordID = CKRecord.ID(recordName: shareId)
        return try await publicDatabase.record(for: recordID)
    }

    private func fetchPhotoRecords(shareId: String) async throws -> [CKRecord] {
        let predicate = NSPredicate(format: "shareId == %@", shareId)
        let query = CKQuery(recordType: "SharedPhoto", predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "orderIndex", ascending: true)]

        let (matchResults, _) = try await publicDatabase.records(matching: query)

        var records: [CKRecord] = []
        for (_, result) in matchResults {
            if case .success(let record) = result {
                records.append(record)
            }
        }
        return records
    }

    private func parseVacation(from record: CKRecord, shareId: String) -> SharedVacation {
        SharedVacation(
            shareId: shareId,
            locationName: record["locationName"] as? String ?? "Vacation",
            startDate: record["startDate"] as? Date ?? Date(),
            endDate: record["endDate"] as? Date ?? Date(),
            photoCount: record["photoCount"] as? Int ?? 0,
            sharedBy: record["sharedBy"] as? String ?? "Someone"
        )
    }

    private func parsePhoto(from record: CKRecord) -> SharedPhoto {
        var localPath: String?
        if let asset = record["photoAsset"] as? CKAsset {
            localPath = asset.fileURL?.path
        }

        return SharedPhoto(
            orderIndex: record["orderIndex"] as? Int ?? 0,
            width: record["width"] as? Int ?? 0,
            height: record["height"] as? Int ?? 0,
            localPath: localPath
        )
    }
}
