import Foundation
import Combine

enum LoadingState {
    case loading
    case loaded
    case error(String)
}

@MainActor
class SharedVacationViewModel: ObservableObject {
    @Published var vacation: SharedVacation?
    @Published var thumbnails: [ThumbnailPhoto] = []
    @Published var state: LoadingState = .loading

    // App Store URL for the full app
    let appStoreURL = URL(string: "https://apps.apple.com/app/vacation-photos/id6740545027")!

    func loadVacation(shareId: String, locationName: String? = nil) {
        state = .loading
        vacation = nil
        thumbnails = []

        Task {
            do {
                // Try to fetch from CloudKit public database via REST API
                async let vacationData = CloudKitWebService.fetchSharedVacation(shareId: shareId)
                async let photosData = CloudKitWebService.fetchPreviewPhotos(shareId: shareId, limit: 3)

                let (fetchedVacation, fetchedPhotos) = try await (vacationData, photosData)

                if let vacationInfo = fetchedVacation {
                    // Got data from CloudKit
                    self.vacation = SharedVacation(
                        shareId: shareId,
                        locationName: vacationInfo.locationName,
                        startDate: Date(),
                        endDate: Date(),
                        photoCount: vacationInfo.photoCount,
                        sharedBy: vacationInfo.sharedBy
                    )

                    self.thumbnails = fetchedPhotos.compactMap { photo in
                        guard let url = photo.url else { return nil }
                        return ThumbnailPhoto(
                            orderIndex: photo.orderIndex,
                            url: url,
                            width: photo.width,
                            height: photo.height
                        )
                    }
                } else {
                    // Fallback: use location from URL parameter
                    self.vacation = SharedVacation(
                        shareId: shareId,
                        locationName: locationName ?? "Shared Vacation",
                        startDate: Date(),
                        endDate: Date(),
                        photoCount: 0,
                        sharedBy: "A friend"
                    )
                }

                self.state = .loaded

            } catch {
                print("CloudKit fetch error: \(error)")

                // Fallback: show landing page with URL-provided location
                self.vacation = SharedVacation(
                    shareId: shareId,
                    locationName: locationName ?? "Shared Vacation",
                    startDate: Date(),
                    endDate: Date(),
                    photoCount: 0,
                    sharedBy: "A friend"
                )
                self.state = .loaded
            }
        }
    }
}

// Models are defined in Models.swift
