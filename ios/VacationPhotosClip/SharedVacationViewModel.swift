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
    @Published var errorMessage: String?  // Compact error for debugging

    // App Store URL for the full app
    let appStoreURL = URL(string: "https://apps.apple.com/app/vacation-photos/id6740545027")!

    func loadVacation(shareId: String, locationName: String? = nil) {
        state = .loading
        vacation = nil
        thumbnails = []
        errorMessage = nil

        Task {
            do {
                // First fetch vacation metadata to get photoCount
                let fetchedVacation = try await CloudKitWebService.fetchSharedVacation(shareId: shareId)

                // Then fetch photos using lookup (requires knowing photoCount for predictable record names)
                let photoCount = fetchedVacation?.photoCount ?? 3
                let fetchedPhotos = try await CloudKitWebService.fetchPreviewPhotos(
                    shareId: shareId,
                    limit: 3,
                    photoCount: photoCount
                )

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

                    // Debug: show if photos failed to load
                    if self.thumbnails.isEmpty && vacationInfo.photoCount > 0 {
                        self.errorMessage = "Photos: 0/\(vacationInfo.photoCount) loaded"
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

                // Set compact error message for debugging
                self.errorMessage = "CloudKit: \(error.localizedDescription)"

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
