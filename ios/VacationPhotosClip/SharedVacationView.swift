import SwiftUI

struct SharedVacationView: View {
    @ObservedObject var viewModel: SharedVacationViewModel

    var body: some View {
        ZStack {
            // Gradient background
            LinearGradient(
                gradient: Gradient(colors: [Color.blue.opacity(0.8), Color.purple.opacity(0.8)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            switch viewModel.state {
            case .loading:
                LoadingView(message: "Loading...")

            case .error(let message):
                ErrorView(message: message) {
                    if let shareId = viewModel.vacation?.shareId {
                        viewModel.loadVacation(shareId: shareId)
                    }
                }

            case .loaded:
                landingView
            }
        }
    }

    private var landingView: some View {
        VStack(spacing: 24) {
            Spacer()

            // App icon placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 100, height: 100)

                Image(systemName: "photo.on.rectangle.angled")
                    .font(.system(size: 44))
                    .foregroundColor(.white)
            }

            // Title - show location name prominently
            VStack(spacing: 8) {
                if let vacation = viewModel.vacation {
                    Text(vacation.locationName)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                } else {
                    Text("Vacation Photos")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }

                Text("Vacation Photos")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
            }

            // Description
            VStack(spacing: 12) {
                Text("Someone shared photos with you!")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.9))

                Text("Download the app to view and save all the photos.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            // Features list
            VStack(alignment: .leading, spacing: 12) {
                featureRow(icon: "photo.stack", text: "View all shared photos")
                featureRow(icon: "square.and.arrow.down", text: "Save photos to your library")
                featureRow(icon: "map", text: "See vacation locations on a map")
                featureRow(icon: "person.2", text: "Share your own vacations")
            }
            .padding(.horizontal, 32)

            Spacer()

            // Download button
            Button(action: openAppStore) {
                HStack(spacing: 12) {
                    Image(systemName: "arrow.down.app.fill")
                        .font(.title2)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Download")
                            .font(.headline)
                        Text("Vacation Photos")
                            .font(.caption)
                            .opacity(0.8)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.white)
                .foregroundColor(.blue)
                .cornerRadius(16)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .frame(width: 24)
                .foregroundColor(.white)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.9))
            Spacer()
        }
    }

    private func openAppStore() {
        UIApplication.shared.open(viewModel.appStoreURL)
    }
}

struct ErrorView: View {
    let message: String
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.orange)

            Text("Unable to Load")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text(message)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(action: retryAction) {
                Text("Try Again")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
