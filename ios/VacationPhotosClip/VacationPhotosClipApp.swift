import SwiftUI

// Parsed data from the share URL
struct ShareURLData {
    let shareId: String
    let locationName: String?
}

@main
struct VacationPhotosClipApp: App {
    @State private var urlData: ShareURLData?

    var body: some Scene {
        WindowGroup {
            ContentView(urlData: $urlData)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    handleUserActivity(activity)
                }
                .onOpenURL { url in
                    urlData = parseURL(url)
                }
        }
    }

    private func handleUserActivity(_ activity: NSUserActivity) {
        guard let url = activity.webpageURL else { return }
        urlData = parseURL(url)
    }

    private func parseURL(_ url: URL) -> ShareURLData? {
        let urlString = url.absoluteString

        // Default App Clip link: appclip.apple.com/id?p=...&token={shareId}&location={name}
        if urlString.contains("appclip.apple.com"),
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
            let location = components.queryItems?.first(where: { $0.name == "location" })?.value
            let decodedLocation = location?.removingPercentEncoding
            return ShareURLData(shareId: token, locationName: decodedLocation)
        }

        // Legacy GitHub Pages: github.io/share/{shareId}
        if let match = urlString.range(of: #"github\.io/share/([a-zA-Z0-9-]+)"#, options: .regularExpression) {
            let path = String(urlString[match])
            if let shareId = path.components(separatedBy: "/").last {
                return ShareURLData(shareId: shareId, locationName: nil)
            }
        }

        // Generic /share/{shareId} pattern
        if let match = urlString.range(of: #"/share/([a-zA-Z0-9-]+)"#, options: .regularExpression) {
            let path = String(urlString[match])
            if let shareId = path.components(separatedBy: "/").last {
                return ShareURLData(shareId: shareId, locationName: nil)
            }
        }

        // Query param: ?shareId={shareId}
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let shareId = components.queryItems?.first(where: { $0.name == "shareId" })?.value {
            return ShareURLData(shareId: shareId, locationName: nil)
        }

        return nil
    }
}
