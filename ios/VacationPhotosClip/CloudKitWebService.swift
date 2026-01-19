import Foundation

/// CloudKit Web Services client for fetching public database records
/// Uses REST API instead of CloudKit SDK to avoid entitlement requirements
struct CloudKitWebService {

    // MARK: - Configuration

    static let containerIdentifier = "iCloud.com.swapp1990.vacationphotos"
    static let environment = "production" // Use "development" for testing

    private static let baseURL = "https://api.apple-cloudkit.com/database/1/\(containerIdentifier)/\(environment)/public"

    // MARK: - Response Models

    struct QueryResponse: Codable {
        let records: [RecordResponse]?
        let serverErrorCode: String?
        let reason: String?
    }

    struct RecordResponse: Codable {
        let recordName: String
        let recordType: String
        let fields: [String: FieldValue]
    }

    struct FieldValue: Codable {
        let value: FieldValueContent?
        let type: String?

        var assetDownloadURL: String? {
            return value?.downloadURL
        }

        var intValue: Int? {
            return value?.intValue
        }

        var stringValue: String? {
            return value?.stringValue
        }
    }

    // MARK: - Fetch Shared Vacation

    static func fetchSharedVacation(shareId: String) async throws -> SharedVacationData? {
        let url = URL(string: "\(baseURL)/records/lookup")!

        let body: [String: Any] = [
            "records": [
                ["recordName": shareId]
            ]
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw CloudKitError.invalidResponse
        }

        // Debug: print response
        if let responseString = String(data: data, encoding: .utf8) {
            print("CloudKit Response: \(responseString)")
        }

        guard httpResponse.statusCode == 200 else {
            throw CloudKitError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoded = try JSONDecoder().decode(LookupResponse.self, from: data)

        guard let record = decoded.records?.first else {
            return nil
        }

        return SharedVacationData(
            shareId: shareId,
            locationName: record.fields["locationName"]?.stringValue ?? "Vacation",
            photoCount: record.fields["photoCount"]?.intValue ?? 0,
            sharedBy: record.fields["sharedBy"]?.stringValue ?? "Someone"
        )
    }

    // MARK: - Fetch Preview Photos

    static func fetchPreviewPhotos(shareId: String, limit: Int = 3) async throws -> [PhotoData] {
        let url = URL(string: "\(baseURL)/records/query")!

        let body: [String: Any] = [
            "query": [
                "recordType": "SharedPhoto",
                "filterBy": [
                    [
                        "fieldName": "shareId",
                        "comparator": "EQUALS",
                        "fieldValue": ["value": shareId, "type": "STRING"]
                    ]
                ],
                "sortBy": [
                    ["fieldName": "orderIndex", "ascending": true]
                ]
            ],
            "resultsLimit": limit
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw CloudKitError.invalidResponse
        }

        // Debug: print response
        if let responseString = String(data: data, encoding: .utf8) {
            print("CloudKit Photos Response: \(responseString)")
        }

        guard httpResponse.statusCode == 200 else {
            throw CloudKitError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoded = try JSONDecoder().decode(QueryResponse.self, from: data)

        guard let records = decoded.records else {
            return []
        }

        return records.compactMap { record -> PhotoData? in
            guard let assetField = record.fields["photoAsset"],
                  let downloadURL = assetField.assetDownloadURL else {
                return nil
            }

            return PhotoData(
                orderIndex: record.fields["orderIndex"]?.intValue ?? 0,
                downloadURL: downloadURL,
                width: record.fields["width"]?.intValue ?? 200,
                height: record.fields["height"]?.intValue ?? 200
            )
        }
    }

    // MARK: - Error Types

    enum CloudKitError: Error, LocalizedError {
        case invalidResponse
        case httpError(statusCode: Int)
        case decodingError
        case notFound

        var errorDescription: String? {
            switch self {
            case .invalidResponse:
                return "Invalid response from server"
            case .httpError(let code):
                return "HTTP error: \(code)"
            case .decodingError:
                return "Failed to decode response"
            case .notFound:
                return "Record not found"
            }
        }
    }
}

// MARK: - Lookup Response

struct LookupResponse: Codable {
    let records: [CloudKitRecord]?
}

struct CloudKitRecord: Codable {
    let recordName: String
    let recordType: String
    let fields: [String: CloudKitFieldValue]
}

struct CloudKitFieldValue: Codable {
    let value: FieldValueContent?
    let type: String?

    var stringValue: String? {
        return value?.stringValue
    }

    var intValue: Int? {
        return value?.intValue
    }

    var assetDownloadURL: String? {
        return value?.downloadURL
    }
}

// Flexible content that can be a primitive OR an asset object
enum FieldValueContent: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case asset(AssetContent)
    case null

    struct AssetContent: Codable {
        let downloadURL: String?
        let fileChecksum: String?
        let size: Int?
    }

    var stringValue: String? {
        if case .string(let str) = self { return str }
        return nil
    }

    var intValue: Int? {
        if case .int(let num) = self { return num }
        if case .double(let num) = self { return Int(num) }
        return nil
    }

    var downloadURL: String? {
        if case .asset(let asset) = self { return asset.downloadURL }
        return nil
    }

    init(from decoder: Decoder) throws {
        // First try to decode as a primitive
        let container = try decoder.singleValueContainer()

        if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            self = .double(doubleValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else if let assetValue = try? container.decode(AssetContent.self) {
            self = .asset(assetValue)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .double(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .asset(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

// MARK: - Flexible Value Type

enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            self = .double(doubleValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

// MARK: - Data Models

struct SharedVacationData {
    let shareId: String
    let locationName: String
    let photoCount: Int
    let sharedBy: String
}

struct PhotoData {
    let orderIndex: Int
    let downloadURL: String
    let width: Int
    let height: Int

    var url: URL? {
        URL(string: downloadURL)
    }
}
