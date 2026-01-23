import SwiftUI

struct SharedVacationView: View {
    @ObservedObject var viewModel: SharedVacationViewModel
    @State private var selectedPhotoIndex: Int? = nil

    private let primaryColor = Color(red: 0.39, green: 0.40, blue: 0.95) // #6366F1
    private let cyanHighlight = Color(red: 0.4, green: 0.8, blue: 1.0) // Cyan for name

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
                AppClipLoadingView(message: "Loading...")

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
            if selectedPhotoIndex != nil {
                imageViewerOverlay
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

            // Middle section: Location, photo count, and thumbnails
            middleSection

            Spacer()

            // Bottom section: Tagline, bridge question, and button
            bottomSection
                .offset(y: -60) // Move up to close gap
        }
    }

    // MARK: - Middle Section

    private var middleSection: some View {
        VStack(spacing: 4) {
            if let vacation = viewModel.vacation {
                // Location title
                Text(vacation.locationName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                // Photo count
                Text("\(vacation.photoCount) photos")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.85))
                    .padding(.bottom, 32)
            }

            // Hero thumbnails
            if !viewModel.thumbnails.isEmpty {
                heroThumbnails
            }
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Hero Thumbnails

    private var heroThumbnails: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                ForEach(Array(viewModel.thumbnails.prefix(3).enumerated()), id: \.element.id) { index, thumbnail in
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedPhotoIndex = index
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

    // MARK: - Bottom Section

    private var bottomSection: some View {
        VStack(spacing: 16) {
            // Tagline: "Sarah shared a vacation with you!"
            if let vacation = viewModel.vacation {
                (Text(vacation.sharedBy)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(cyanHighlight)
                + Text(" shared a vacation with you!")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white))
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
            }

            // Bridge question
            Text("What vacations are hiding in your Photos app?")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                .padding(.top, 8)

            // Find Out button (matching onboarding style)
            Button(action: openAppStore) {
                Text("Find Out")
                    .font(.system(size: 18, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.white)
                    .padding(.horizontal, 48)
                    .padding(.vertical, 16)
                    .background(primaryColor)
                    .cornerRadius(9999)
                    .shadow(color: primaryColor.opacity(0.4), radius: 6, x: 0, y: 4)
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 48)
    }

    // MARK: - Image Viewer Overlay

    private var imageViewerOverlay: some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Close button header
                HStack {
                    Spacer()
                    Button(action: {
                        withAnimation(.easeOut(duration: 0.2)) {
                            selectedPhotoIndex = nil
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(20)
                }

                // Swipeable photo viewer
                TabView(selection: Binding(
                    get: { selectedPhotoIndex ?? 0 },
                    set: { selectedPhotoIndex = $0 }
                )) {
                    ForEach(Array(viewModel.thumbnails.prefix(3).enumerated()), id: \.element.id) { index, thumbnail in
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
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic))

                // Footer
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

// MARK: - App Clip Loading View

struct AppClipLoadingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.5)

            Text(message)
                .font(.system(size: 15))
                .foregroundColor(.white.opacity(0.8))
        }
    }
}
