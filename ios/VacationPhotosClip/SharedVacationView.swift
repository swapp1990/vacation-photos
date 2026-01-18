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
        ScrollView {
            VStack(spacing: 20) {
                Spacer().frame(height: 20)

                // Photo thumbnails (if available)
                if !viewModel.thumbnails.isEmpty {
                    thumbnailsSection
                } else {
                    // App icon placeholder when no thumbnails
                    appIconPlaceholder
                }

                // Title - show location name prominently
                VStack(spacing: 8) {
                    if let vacation = viewModel.vacation {
                        Text(vacation.locationName)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)

                        if vacation.photoCount > 0 {
                            Text("\(vacation.photoCount) photos")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    } else {
                        Text("Vacation Photos")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }

                    Text("Vacation Photos")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }

                // Description
                VStack(spacing: 12) {
                    if let vacation = viewModel.vacation {
                        Text("\(vacation.sharedBy) shared photos with you!")
                            .font(.headline)
                            .foregroundColor(.white.opacity(0.9))
                    } else {
                        Text("Someone shared photos with you!")
                            .font(.headline)
                            .foregroundColor(.white.opacity(0.9))
                    }

                    Text("Download the app to view and save all the photos.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                // Features list
                VStack(alignment: .leading, spacing: 12) {
                    featureRow(icon: "photo.stack", text: "View all shared photos")
                    featureRow(icon: "square.and.arrow.down", text: "Save photos to your library")
                    featureRow(icon: "map", text: "See vacation locations on a map")
                    featureRow(icon: "person.2", text: "Share your own vacations")
                }
                .padding(.horizontal, 32)
                .padding(.vertical, 16)

                Spacer().frame(height: 20)

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
    }

    // MARK: - Thumbnails Section

    private var thumbnailsSection: some View {
        VStack(spacing: 12) {
            // Display up to 3 thumbnails in a horizontal row
            HStack(spacing: 8) {
                ForEach(viewModel.thumbnails.prefix(3)) { thumbnail in
                    AsyncImage(url: thumbnail.url) { phase in
                        switch phase {
                        case .empty:
                            thumbnailPlaceholder
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: thumbnailSize, height: thumbnailSize)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        case .failure:
                            thumbnailErrorPlaceholder
                        @unknown default:
                            thumbnailPlaceholder
                        }
                    }
                    .frame(width: thumbnailSize, height: thumbnailSize)
                }
            }

            // "X more photos" indicator
            if let vacation = viewModel.vacation, vacation.photoCount > 3 {
                Text("+\(vacation.photoCount - 3) more photos")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(.top, 20)
    }

    private var thumbnailSize: CGFloat {
        // Calculate size based on number of thumbnails (max 3)
        let count = min(viewModel.thumbnails.count, 3)
        let totalWidth: CGFloat = 300
        let spacing: CGFloat = 8
        let availableWidth = totalWidth - (CGFloat(count - 1) * spacing)
        return availableWidth / CGFloat(count)
    }

    private var thumbnailPlaceholder: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.white.opacity(0.2))
            .overlay(
                ProgressView()
                    .tint(.white)
            )
    }

    private var thumbnailErrorPlaceholder: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.white.opacity(0.2))
            .overlay(
                Image(systemName: "photo")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.5))
            )
    }

    // MARK: - App Icon Placeholder

    private var appIconPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.2))
                .frame(width: 100, height: 100)

            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 44))
                .foregroundColor(.white)
        }
    }

    // MARK: - Feature Row

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

// MARK: - Error View

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
