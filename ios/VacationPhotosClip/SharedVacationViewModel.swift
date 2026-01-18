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
    @Published var photos: [SharedPhoto] = []
    @Published var state: LoadingState = .loading

    // App Store URL for the full app
    let appStoreURL = URL(string: "https://apps.apple.com/app/vacation-photos/id6740545027")!

    func loadVacation(shareId: String, locationName: String? = nil) {
        state = .loading
        vacation = nil
        photos = []

        // Since we can't use CloudKit in the App Clip due to provisioning restrictions,
        // we show a preview and encourage users to download the full app
        Task {
            // Simulate a brief loading time
            try? await Task.sleep(nanoseconds: 500_000_000)

            // Create vacation with location from URL (or fallback)
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
