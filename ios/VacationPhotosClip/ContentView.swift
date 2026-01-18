import SwiftUI

struct ContentView: View {
    @Binding var urlData: ShareURLData?
    @StateObject private var viewModel = SharedVacationViewModel()
    @State private var hasTimedOut = false

    var body: some View {
        Group {
            if let data = urlData {
                SharedVacationView(viewModel: viewModel)
                    .onAppear {
                        viewModel.loadVacation(shareId: data.shareId, locationName: data.locationName)
                    }
            } else if hasTimedOut {
                // No URL received - show landing page with test data
                SharedVacationView(viewModel: viewModel)
                    .onAppear {
                        viewModel.loadVacation(shareId: "test-preview", locationName: "Sample Vacation")
                    }
            } else {
                LoadingView(message: "Opening shared vacation...")
                    .onAppear {
                        // Wait briefly for URL, then show landing page
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                            if urlData == nil {
                                hasTimedOut = true
                            }
                        }
                    }
            }
        }
    }
}

struct LoadingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text(message)
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
