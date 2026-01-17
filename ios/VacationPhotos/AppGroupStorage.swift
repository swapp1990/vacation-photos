import Foundation

@objc(AppGroupStorage)
class AppGroupStorage: NSObject {

  static let APP_GROUP_ID = "group.com.swapp1990.vacationphotos"

  @objc
  func setData(_ key: String, value: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: AppGroupStorage.APP_GROUP_ID) else {
      rejecter("ERROR", "Could not access App Group storage", nil)
      return
    }

    defaults.set(value, forKey: key)
    defaults.synchronize()
    resolver(true)
  }

  @objc
  func getData(_ key: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: AppGroupStorage.APP_GROUP_ID) else {
      rejecter("ERROR", "Could not access App Group storage", nil)
      return
    }

    let value = defaults.string(forKey: key)
    resolver(value)
  }

  @objc
  func removeData(_ key: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: AppGroupStorage.APP_GROUP_ID) else {
      rejecter("ERROR", "Could not access App Group storage", nil)
      return
    }

    defaults.removeObject(forKey: key)
    defaults.synchronize()
    resolver(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
