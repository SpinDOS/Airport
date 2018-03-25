const enum AirplaneStatus {
  WaitingForLanding = "Waiting for landing",
  Landing = "Landing",
  WaitingForFollowMe = "Waiting for Follow-Me car after landing",
  FollowingAfterLanding = "Following Follow-Me car after landing",
  OnParkingAfterLandingLoaded = "On parking with passengers and baggage on the board after landing",
  UnloadingPassengersAndBaggage = "Unloading passengers and baggage",
  OnParkingEmpty = "On parking (empty)",
  Fuelling = "Fuelling",
  LoadingPassengersAndBaggage = "Loading passengers and baggage",
  OnParkingBeforeDepartureLoaded = "On parking with passengers and baggage on the board before departure",
  FollowingToStrip = "Following Follow-Me to strip",
  PreparingToDeparture = "Preparing to departure",
  Departuring = "Departuring"
}