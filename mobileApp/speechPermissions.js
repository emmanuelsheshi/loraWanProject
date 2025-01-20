import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

ExpoSpeechRecognitionModule.getPermissionsAsync().then((result) => {
  console.log("Status:", result.status);
  console.log("Granted:", result.granted);
  console.log("Can ask again:", result.canAskAgain);
  console.log("Expires:", result.expires);
});

ExpoSpeechRecognitionModule.requestPermissionsAsync().then((result) => {
  if (!result.granted) {
    console.warn("Permissions not granted", result);
    return;
  }
  // Permissions granted! Start speech recognition, or at some other time...
  ExpoSpeechRecognitionModule.start({ lang: "en-US" });
});
