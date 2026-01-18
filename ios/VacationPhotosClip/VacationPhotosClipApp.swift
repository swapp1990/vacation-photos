import SwiftUI

@main
struct VacationPhotosClipApp: App {
    @State private var shareId: String?

    var body: some Scene {
        WindowGroup {
            ContentView(shareId: $shareId)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    handleUserActivity(activity)
                }
                .onOpenURL { url in
                    shareId = parseShareId(from: url)
                }
        }
    }

    private func handleUserActivity(_ activity: NSUserActivity) {
        guard let url = activity.webpageURL else { return }
        shareId = parseShareId(from: url)
    }

    private func parseShareId(from url: URL) -> String? {
        let urlString = url.absoluteString

        // Default App Clip link: appclip.apple.com/id?p=...&token={shareId}
        if urlString.contains("appclip.apple.com"),
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
            return token
        }

        // Legacy GitHub Pages: github.io/share/{shareId}
        if let match = urlString.range(of: #"github\.io/share/([a-zA-Z0-9-]+)"#, options: .regularExpression) {
            let path = String(urlString[match])
            return path.components(separatedBy: "/").last
        }

        // Generic /share/{shareId} pattern
        if let match = urlString.range(of: #"/share/([a-zA-Z0-9-]+)"#, options: .regularExpression) {
            let path = String(urlString[match])
            return path.components(separatedBy: "/").last
        }

        // Query param: ?shareId={shareId}
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let shareId = components.queryItems?.first(where: { $0.name == "shareId" })?.value {
            return shareId
        }

        return nil
    }
}
