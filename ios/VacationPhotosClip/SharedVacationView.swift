import SwiftUI

struct SharedVacationView: View {
    @ObservedObject var viewModel: SharedVacationViewModel
    @State private var selectedPhotoIndex: Int = 0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch viewModel.state {
            case .loading:
                LoadingView(message: "Loading vacation photos...")

            case .error(let message):
                ErrorView(message: message) {
                    if let shareId = viewModel.vacation?.shareId {
                        viewModel.loadVacation(shareId: shareId)
                    }
                }

            case .loaded:
                if let vacation = viewModel.vacation {
                    VStack(spacing: 0) {
                        // Header
                        headerView(vacation: vacation)

                        // Photo Gallery
                        if viewModel.photos.isEmpty {
                            emptyPhotosView
                        } else {
                            photoGalleryView
                        }

                        // Get Full App Button
                        getFullAppButton
                    }
                }
            }
        }
    }

    private func headerView(vacation: SharedVacation) -> some View {
        VStack(spacing: 8) {
            Text(vacation.locationName)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text("\(vacation.sharedBy) shared \(vacation.photoCount) photos")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))

            Text(vacation.dateRange)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.black.opacity(0.3))
    }

    private var emptyPhotosView: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.5))
            Text("Loading photos...")
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var photoGalleryView: some View {
        TabView(selection: $selectedPhotoIndex) {
            ForEach(Array(viewModel.photos.enumerated()), id: \.offset) { index, photo in
                PhotoView(photo: photo)
                    .tag(index)
            }
        }
        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .automatic))
    }

    private var getFullAppButton: some View {
        Button(action: openAppStore) {
            HStack {
                Image(systemName: "arrow.down.app.fill")
                Text("Get Full App")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .padding()
        .background(Color.black)
    }

    private func openAppStore() {
        if let url = URL(string: "https://apps.apple.com/app/id6756803475") {
            UIApplication.shared.open(url)
        }
    }
}

struct PhotoView: View {
    let photo: SharedPhoto
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                ProgressView()
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear {
            loadImage()
        }
    }

    private func loadImage() {
        guard let path = photo.localPath else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            if let uiImage = UIImage(contentsOfFile: path) {
                DispatchQueue.main.async {
                    self.image = uiImage
                }
            }
        }
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
        .background(Color.black)
    }
}
