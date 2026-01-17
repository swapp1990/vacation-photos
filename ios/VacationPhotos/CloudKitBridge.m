#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CloudKitManager, NSObject)

RCT_EXTERN_METHOD(uploadSharedVacation:(NSString *)shareId
                  locationName:(NSString *)locationName
                  startDate:(double)startDate
                  endDate:(double)endDate
                  photoCount:(int)photoCount
                  sharedBy:(NSString *)sharedBy
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(uploadPhoto:(NSString *)shareId
                  photoPath:(NSString *)photoPath
                  orderIndex:(int)orderIndex
                  width:(int)width
                  height:(int)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchSharedVacation:(NSString *)shareId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchSharedPhotos:(NSString *)shareId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchPreviewPhotos:(NSString *)shareId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(checkAvailability:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
