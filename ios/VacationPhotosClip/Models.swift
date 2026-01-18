import Foundation

struct SharedVacation {
    let shareId: String
    let locationName: String
    let startDate: Date
    let endDate: Date
    let photoCount: Int
    let sharedBy: String

    var dateRange: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none

        if Calendar.current.isDate(startDate, inSameDayAs: endDate) {
            return formatter.string(from: startDate)
        } else {
            return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
        }
    }
}

struct SharedPhoto {
    let orderIndex: Int
    let width: Int
    let height: Int
    let localPath: String?
}

struct ThumbnailPhoto: Identifiable {
    let orderIndex: Int
    let url: URL
    let width: Int
    let height: Int

    var id: Int { orderIndex }
}
