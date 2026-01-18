import SwiftUI

struct ContentView: View {
    @Binding var shareId: String?
    @StateObject private var viewModel = SharedVacationViewModel()

    var body: some View {
        Group {
            if let shareId = shareId {
                SharedVacationView(viewModel: viewModel)
                    .onAppear {
                        viewModel.loadVacation(shareId: shareId)
                    }
                    .onChange(of: shareId) { newId in
                        if let newId = newId {
                            viewModel.loadVacation(shareId: newId)
                        }
                    }
            } else {
                LoadingView(message: "Opening shared vacation...")
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
