import SwiftUI

struct SharedVacationView: View {
    @ObservedObject var viewModel: SharedVacationViewModel
    @State private var selectedThumbnail: ThumbnailPhoto? = nil

    private let primaryColor = Color(red: 0.39, green: 0.40, blue: 0.95) // #6366F1

    var body: some View {
        ZStack {
            // Blurred background image
            Image("VacationSplash")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .blur(radius: 8)
                .scaleEffect(1.1) // Prevent blur edge artifacts
                .ignoresSafeArea()

            // Dark overlay for better readability
            Color.black.opacity(0.3)
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

            // Fullscreen image viewer overlay
            if let thumbnail = selectedThumbnail {
                imageViewerOverlay(thumbnail: thumbnail)
            }
        }
    }

    private var landingView: some View {
        VStack(spacing: 0) {
            // Error banner at top if any
            if let error = viewModel.errorMessage {
                errorBanner(message: error)
                    .padding(.top, 50)
            }

            Spacer()

            // HERO: Large thumbnails - main focus
            if !viewModel.thumbnails.isEmpty {
                heroThumbnails
            }

            Spacer()

            // Compact bottom card
            bottomCard
        }
    }

    // MARK: - Hero Thumbnails (Main Focus)

    private var heroThumbnails: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                ForEach(viewModel.thumbnails.prefix(3)) { thumbnail in
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedThumbnail = thumbnail
                        }
                    }) {
                        AsyncImage(url: thumbnail.url) { phase in
                            switch phase {
                            case .empty:
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.2))
                                    .overlay(ProgressView().tint(.white))
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: heroThumbnailSize, height: heroThumbnailSize)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
                            case .failure:
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.2))
                                    .overlay(
                                        Image(systemName: "photo")
                                            .font(.largeTitle)
                                            .foregroundColor(.white.opacity(0.5))
                                    )
                            @unknown default:
                                EmptyView()
                            }
                        }
                        .frame(width: heroThumbnailSize, height: heroThumbnailSize)
                    }
                }
            }

            // Tap hint
            Text("Tap to preview")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.7))
        }
    }

    private var heroThumbnailSize: CGFloat {
        let count = min(viewModel.thumbnails.count, 3)
        let screenWidth = UIScreen.main.bounds.width
        let totalSpacing: CGFloat = 24 + (CGFloat(count - 1) * 12) + 24 // margins + gaps
        return (screenWidth - totalSpacing) / CGFloat(count)
    }

    // MARK: - Compact Bottom Card

    private var bottomCard: some View {
        VStack(spacing: 12) {
            // Sharer info - highlighted
            if let vacation = viewModel.vacation {
                HStack(spacing: 4) {
                    Text(vacation.sharedBy)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(red: 0.4, green: 0.8, blue: 1.0)) // Highlighted cyan
                    Text("shared")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.9))
                }

                // Location - smaller
                Text(vacation.locationName)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                // Photo count
                Text("\(vacation.photoCount) photos")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.7))
            }

            // Compact features - single line each, smaller
            VStack(alignment: .leading, spacing: 6) {
                featureRow(emoji: "✨", text: "Find your own vacation photos")
                featureRow(emoji: "📁", text: "Auto-organized by location")
                featureRow(emoji: "🔒", text: "Private - stays on your phone")
            }
            .padding(.top, 8)

            // Let's Go button
            Button(action: openAppStore) {
                Text("Let's Go!")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(primaryColor)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.white)
                    .cornerRadius(25)
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 24)
        .background(
            Color.black.opacity(0.6)
                .clipShape(RoundedCorner(radius: 24, corners: [.topLeft, .topRight]))
        )
        .ignoresSafeArea(edges: .bottom)
    }

    // MARK: - Feature Row

    private func featureRow(emoji: String, text: String) -> some View {
        HStack(spacing: 8) {
            Text(emoji)
                .font(.system(size: 14))
            Text(text)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.85))
        }
    }

    // MARK: - Image Viewer Overlay

    private func imageViewerOverlay(thumbnail: ThumbnailPhoto) -> some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.easeOut(duration: 0.2)) {
                        selectedThumbnail = nil
                    }
                }

            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        withAnimation(.easeOut(duration: 0.2)) {
                            selectedThumbnail = nil
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(20)
                }

                Spacer()

                AsyncImage(url: thumbnail.url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .cornerRadius(12)
                            .padding(.horizontal, 16)
                    case .failure:
                        VStack(spacing: 12) {
                            Image(systemName: "photo")
                                .font(.system(size: 48))
                                .foregroundColor(.white.opacity(0.5))
                            Text("Failed to load")
                                .foregroundColor(.white.opacity(0.7))
                        }
                    @unknown default:
                        EmptyView()
                    }
                }

                Spacer()

                Text("Get the app to save photos")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.6))
                    .padding(.bottom, 40)
            }
        }
        .transition(.opacity)
    }

    private func openAppStore() {
        UIApplication.shared.open(viewModel.appStoreURL)
    }

    // MARK: - Error Banner

    private func errorBanner(message: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.caption2)
            Text(message)
                .font(.caption2)
                .lineLimit(2)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.red.opacity(0.9))
        .cornerRadius(6)
    }
}

// MARK: - Rounded Corner Helper

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String
    let retryAction: () -> Void

    private let primaryColor = Color(red: 0.39, green: 0.40, blue: 0.95)

    var body: some View {
        ZStack {
            Image("VacationSplash")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .blur(radius: 8)
                .scaleEffect(1.1)
                .ignoresSafeArea()

            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Text("⚠️")
                    .font(.system(size: 44))

                Text("Unable to Load")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Text(message)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Button(action: retryAction) {
                    Text("Try Again")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(primaryColor)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .cornerRadius(20)
                }
            }
            .padding(24)
            .background(Color.black.opacity(0.5))
            .cornerRadius(20)
        }
    }
}
