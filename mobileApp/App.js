import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
  // ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { ScrollView } from "react-native-virtualized-view";
import { BleManager } from "react-native-ble-plx";
import Ionicons from "react-native-vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { Image } from "expo-image";

import styled from "styled-components";

import { requestBluetoothPermission } from "./myPermissionRequest";
import requestPermissions from "./useBLE";

import {
  Button,
  TextInput,
  IconButton,
  Switch,
  Icon,
} from "react-native-paper";

let bleManager = null;
// converter = new USNG.Converter();

// Static UUIDs for Bluetooth service and characteristics
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0"; // Example static UUID
const TEXT_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1"; // Text UUID
const QUICK_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef2"; // Voice UUID
const DEVICE_LOCATION_UUID = "12345678-1234-5678-1234-56789abcdef3"; // local gps

requestBluetoothPermission();
requestPermissions();

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height.toFixed(0);

console.log(windowHeight, "-->>>");

export default function App() {
  const [recordings, setRecordings] = useState([]);
  const [device, setDevice] = useState(null);
  const [deviceID, setDeviceID] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Searching...");
  const [isQuickDialMode, setIsQuickDialMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [receivedMessages, setReceivedMessages] = useState([]); // New state for received messages
  const [sentMessages, setSentMessages] = useState([]);
  const [data, setData] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [distance, setDistance] = useState(0);

  const [mgrsCoord, setMgrsCoord] = useState("");

  const deviceRef = useRef(null);
  const flatListRef = useRef(null);
  const flatListRef2 = useRef(null);

  const [gpsData, setGpsData] = useState({
    latitude: "0.0",
    longitude: "0.0",
    speed: "0",
    distance: "0",
    time: new Date().toLocaleTimeString(),
  });

  const [gpsLocalData, setGpsLocalData] = useState({
    latitude: "0.0",
    longitude: "0.0",
    speed: "0.0",
    distance: "0.0",
    time: new Date().toLocaleTimeString(),
  });

  const searchAndConnectToDevice = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);

        setConnectionStatus("Connention Error");
        return;
      }
      if (device.name === "lora" || device.name === "lora2") {
        bleManager.stopDeviceScan();
        setConnectionStatus("Connecting...");
        setDevice(device);
        connectToDevice(device);
      }
    });
  };

  useEffect(() => {
    bleManager = new BleManager();
    searchAndConnectToDevice();
    console.log("scanning and connecting to device");
  }, []);

  const connectToDevice = (device) => {
    // console.log("connecting to device:", device);
    return device
      .connect()
      .then((device) => {
        setDeviceID(device.id);
        setDeviceName(device.name);
        setConnectionStatus("Connected");
        deviceRef.current = device;
        return device.discoverAllServicesAndCharacteristics();
      })
      .then((device) => {
        return device.services();
      })
      .then((services) => {
        let service = services.find((service) => service.uuid === SERVICE_UUID);

        return service.characteristics();
      })
      .then((characteristics) => {
        let receivedCharacteristic = characteristics.find(
          (char) => char.uuid === QUICK_CHARACTERISTIC_UUID
        );

        setData(receivedCharacteristic);

        let localCharacteriestics = characteristics.find(
          (char) => char.uuid === DEVICE_LOCATION_UUID
        );
        // location

        localCharacteriestics.monitor((error, characteristic) => {
          // console.log("trying to read ===>>>");
          if (error) {
            console.log("Error receiving data:", error);
            setConnectionStatus("Disconnected");
          } else {
            // Update the received messages with new data
            const receivedData2 = atob(characteristic.value); // Assuming base64 encoding

            const [code, latitude, longitude, speed, _] =
              receivedData2.split(",");
            // console.log(
            //   longitude,
            //   code,
            //   speed,
            //   "-------->>>>>>>>>>>>>>>>>>>>>**********"
            // );

            // console.log(code, "----->>>>>>>>>>--->>>>>>>>>");

            if (code === "yy") {
              setGpsLocalData({
                latitude: latitude,
                longitude: longitude,
                speed: speed,
                distance: 0,
                time: new Date().toLocaleTimeString(),
              });
            }

            // console.log(receivedData2, "the received data===>>>>>");

            // if (!receivedData.includes("xx")) {
            //   setReceivedMessages((prevMessages) => [
            //     ...prevMessages,
            //     { key: `${prevMessages.length}`, text: receivedData },
            //   ]);
            // }
          }
        });

        // data
        receivedCharacteristic.monitor((error, characteristic) => {
          console.log("trying to read ===>>>");
          if (error) {
            console.log("Error receiving data:", error);
          } else {
            // Update the received messages with new data
            const receivedData = atob(characteristic.value); // Assuming base64 encoding

            const [code, latitude, longitude, speed] = receivedData.split(",");

            console.log(code, "----->>>>>>>>>>--->>>>>>>>>");

            if (code === "xx") {
              setGpsData({
                latitude: latitude,
                longitude: longitude,
                speed: speed,
                distance: 0,
                time: new Date().toLocaleTimeString(),
              });
            }

            console.log(receivedData, "the received data===>>>>>");

            if (!receivedData.includes("xx")) {
              setReceivedMessages((prevMessages) => [
                ...prevMessages,
                {
                  key: `${prevMessages.length}`,
                  text: receivedData,
                  timestamp: new Date().toUTCString(),
                },
              ]);
            }
          }
        });
      })
      .catch((error) => {
        console.log(error);
        setConnectionStatus("Error in Connection");
      });
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [receivedMessages]);

  useEffect(() => {
    if (flatListRef2.current) {
      flatListRef2.current.scrollToEnd({ animated: true });
    }
  }, [sentMessages]);

  async function sendTextToESP32() {
    if (device) {
      try {
        const textData = textInput.trim();

        // Add the sent message to the state
        setSentMessages((prevMessages) => [
          ...prevMessages,
          {
            key: `${prevMessages.length}`,
            text: textData,
            isSent: true,
            timestamp: new Date().toUTCString(),
          },
        ]);

        // Write to Bluetooth characteristic for text (TEXT_UUID)
        await bleManager
          .writeCharacteristicWithoutResponseForDevice(
            deviceID,
            SERVICE_UUID,
            TEXT_CHARACTERISTIC_UUID,
            btoa(textData) // Encode the text to base64
          )
          .then((characteristic) => {
            console.log("Text data sent to ESP32!");
          })
          .catch((error) => {
            console.log(error);
          });

        setTextInput(""); // Clear the input after sending
      } catch (error) {
        // console.error("Error sending text to ESP32:", error);
        Alert.alert("Connected to a lora device");
      }
    } else {
      Alert.alert(
        "Transmitter Not Connected",
        "Please connect to an Lora transmitter."
      );
    }
  }

  async function sendTextToESP32B(message) {
    if (device) {
      try {
        // Write to Bluetooth characteristic for text (TEXT_UUID)
        await bleManager
          .writeCharacteristicWithoutResponseForDevice(
            deviceID,
            SERVICE_UUID,
            TEXT_CHARACTERISTIC_UUID,
            btoa(message) // Encode the text to base64
          )
          .then((characteristic) => {
            console.log("Text data sent to ESP32!");
          })
          .catch((error) => {
            console.log(error);
          });

        setTextInput(""); // Clear the input after sending
      } catch (error) {
        console.error("Error sending text to ESP32:", error);
      }
    } else {
      Alert.alert(
        "Transmitter Not Connected",
        "Please connect to an Lora transmitter."
      );
    }
  }

  useEffect(() => {
    console.log(bleManager.isDeviceConnected(), "----->>>");
    const subscription = bleManager.onDeviceDisconnected(
      deviceID,
      (error, device) => {
        bleManager.destroy();
        if (error) {
          console.log("Disconnected with error:", error);
        }
        setConnectionStatus("Disconnected");
        console.log("Disconnected device");

        if (deviceRef.current) {
          setConnectionStatus("Reconnecting...");
          connectToDevice(deviceRef.current)
            .then(() => setConnectionStatus("Connected"))
            .catch((error) => {
              console.log("Reconnection failed: ", error);
              setConnectionStatus("Reconnection failed");
            });
        }
      }
    );
    return () => subscription.remove();
  }, [deviceRef]);

  useEffect(() => {
    textInput === "" ? setIsEmpty(true) : setIsEmpty(false);
  }, [textInput]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    bleManager.destroy();
    bleManager = new BleManager();
    searchAndConnectToDevice();
    console.log("scanning and connecting to device");
    console.log(bleManager.isDeviceConnected());

    if (connectionStatus !== "Connected") {
    }

    setTimeout(() => {
      setRefreshing(false);
    }, 2000);

    console.log("Device already connected");
  }, [deviceRef]);

  // console.log(connectionStatus, "===>>>>");

  function calculateDistanceFromGPS(lat1, lon1, lat2, lon2) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let calulatedDistance = R * c; // Distance in kilometers
    setDistance(calulatedDistance.toFixed(2));
  }

  const latLonToMGRS = (lat, lon, precision = 5) => {
    if (!lat || !lon) return "";
    if ((lon && lat) === 0.0) return "_";
    else {
      const zoneNumber = Math.floor((lon + 180) / 6) + 1;
      const centralLongitude = (zoneNumber - 1) * 6 - 180 + 3;
      const easting = 500000 + (lon - centralLongitude) * 111319.5;
      const northing = lat * 110574;

      // Calculate MGRS Grid
      const grid = `${zoneNumber}N`;
      const truncatedEasting = Math.floor(
        easting / Math.pow(10, 5 - precision)
      );
      const truncatedNorthing = Math.floor(
        northing / Math.pow(10, 5 - precision)
      );

      return `${grid} ${truncatedEasting} ${truncatedNorthing}`;
    }
  };

  useEffect(() => {
    calculateDistanceFromGPS(
      gpsLocalData.latitude,
      gpsLocalData.longitude,
      gpsData.latitude,
      gpsData.longitude
    );

    console.log(typeof gpsData.latitude, gpsData.longitude, "------>>>>");
    const coordinates = latLonToMGRS(gpsData.latitude, gpsData.longitude, 5);
    setMgrsCoord(coordinates);
  }, [gpsData]);

  const clearChat = () => {
    setSentMessages([]);
    setReceivedMessages([]);
  };

  return (
    <Container style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="rgba(1, 60, 75, 1)"
      />
      <Container>
        <View style={styles.headerView}>
          <Text style={styles.header}>LoRaWAN Commnunication System </Text>
        </View>

        {/* Connection Status */}
        <ContainerScrollView>
          <ScrollView
            contentContainerStyle={{
              padding: 10,
              // flexGrow: 1,
              display: "flex",
              flexDirection: "row",

              height: "100%",

              justifyContent: "space-between",

              alignItems: "flex-end",

              backgroundColor: "rgba(1, 60, 75, 1)",
              // backgroundColor: "yellow",
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.headerContainer}>
              <View>
                <Text style={styles.header}>LoRaWAN System </Text>
              </View>
              <View style={styles.statusCard}>
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      connectionStatus === "Connected"
                        ? "bluetooth-connect"
                        : "bluetooth-off"
                    }
                    size={14}
                    color={connectionStatus === "Connected" ? "green" : "red"}
                  />
                  <Text style={styles.statusText}>
                    {connectionStatus}{" "}
                    <MaterialCommunityIcons
                      name={"cellphone-basic"}
                      size={14}
                    />{" "}
                    {deviceName}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </ContainerScrollView>

        <View style={styles.quickbuttons}>
          <IconButton
            icon={"air-horn"}
            iconColor="white"
            onPress={() => sendTextToESP32B("alarm")}
          ></IconButton>
          {deviceName === "lora" ? (
            <IconButton
              icon={"google-maps"}
              iconColor="white"
              onPress={() => sendTextToESP32B("track")}
            ></IconButton>
          ) : (
            <Ionicons name="" />
          )}

          <IconButton
            icon={"antenna"}
            iconColor="white"
            onPress={() => sendTextToESP32B("broadcast")}
          ></IconButton>
        </View>

        {/* GPS Information */}

        <View style={styles.infoCard}>
          {deviceName === "lora" ? (
            <View>
              <Text style={styles.infoTitle}>
                Remote Station | {distance} km's away
              </Text>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={18} color="#fff" />
                  <Text style={styles.infoText}>Lat: {gpsData.latitude}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="navigate-outline" size={18} color="#fff" />
                  <Text style={styles.infoText}>Lon: {gpsData.longitude}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="car" size={18} color="#fff" />
                  <Text style={styles.infoText}>Speed: {gpsData.speed}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="compass-outline" size={18} color="#fff" />
                  <Text style={styles.infoText}>MGRS: {mgrsCoord}</Text>
                </View>
              </View>
            </View>
          ) : (
            ""
          )}

          <Text style={styles.infoTitle}>Local Station</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons
                style={{ elevation: 10 }}
                name="location-outline"
                size={18}
                color="#fff"
              />
              <Text style={styles.infoText}>Lat: {gpsLocalData.latitude}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="navigate-outline" size={18} color="#fff" />
              <Text style={styles.infoText}>Lon: {gpsLocalData.longitude}</Text>
            </View>
            {/* <View style={styles.infoItem}>
              <Ionicons name="compass-outline" size={18} color="#fff" />
              <Text style={styles.infoText}>Speed: {gpsLocalData.speed}</Text>
            </View> */}
            <StyledIconButton2
              animated={true}
              icon="trash-can-outline"
              iconColor="white"
              size={18}
              onPress={clearChat}
            />
          </View>
        </View>

        {/* chat box */}

        <View style={styles.receivedMessagesContainer}>
          <Image
            source={require("./assets/chat.png")}
            style={{ width: "100%", height: "100%", position: "absolute" }}
          />
          <View
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              backgroundColor: "#000C",
              zIndex: 0,
            }}
          ></View>
          <FlatList
            style={styles.flatListA}
            ref={flatListRef}
            data={receivedMessages}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageItem,
                  item.isSent ? styles.sentMessage : styles.receivedMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.messageTimeStamp2}>{item.timestamp}</Text>
              </View>
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
          <FlatList
            style={styles.flatListB}
            ref={flatListRef2}
            data={sentMessages}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageItem,
                  item.isSent ? styles.sentMessage : styles.receivedMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.messageTimeStamp}>{item.timestamp}</Text>
              </View>
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>

        <ContainerSendMessage>
          <StyledTextInput
            placeholder="Enter text"
            placeholderTextColor="#aaa"
            textColor="white"
            value={textInput}
            onChangeText={setTextInput}
          />

          <StyledIconButton
            onPress={sendTextToESP32}
            icon="send"
            iconColor="white"
            size={20}
            compact={true}
            disabled={isEmpty}
          ></StyledIconButton>
        </ContainerSendMessage>
      </Container>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    // backgroundColor: "red",
  },
  container2: {
    // backgroundColor: "#1c1c1e",
    backgroundColor: "red",

    flex: 1,

    // backgroundColor: "coral",
    padding: 0,
  },

  headerContainer: {
    display: "flex",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  connectionContainer: {
    height: "100%",
  },
  header: {
    fontSize: 12,
    color: "#fff",
    textAlign: "center",

    // backgroundColor: "rgba(1, 60, 75, 1)",
  },
  headerView: {
    paddingTop: 20,
    height: "2%",
    display: "flex",
    justifyContent: "bottom",
    display: "none",

    backgroundColor: "rgba(1, 60, 75, 1)",
    // backgroundColor: "purple",
  },

  header2: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  statusCard: {},
  statusText: {
    fontSize: 10,
    color: "#fff",
    marginLeft: 2,
  },

  infoCard: {
    padding: 10,
    borderRadius: 10,
    margin: 0,
    backgroundColor: "#0004",

    minHeight: "20%",
  },
  infoTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap", // Allows wrapping to a new line if needed
    justifyContent: "space-between",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%", // Ensures two items per row
    marginBottom: 10,
  },
  infoText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 5,
  },

  input: {
    backgroundColor: "#29292b",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  quickButton: {
    backgroundColor: "#444",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  quickButtonText: { color: "#fff", fontWeight: "bold" },
  buttonText: { color: "#fff", fontWeight: "bold" },

  receivedMessagesContainer: {
    borderRadius: 10,

    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    height: "60%",
  },
  messageItem: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: "75%",
  },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#222",

    color: "#fff", // White text
    fontSize: 12, // Slightly larger font size
    fontStyle: "italic",

    borderRadius: 10, // Rounded corners for a bubble effect
    paddingHorizontal: 10, // Padding on left and right
    paddingVertical: 5, // Padding on top and bottom
    elevation: 6, // Shadow effect (Android)
    shadowColor: "#000", // Shadow color (iOS)
    shadowOffset: { width: 0, height: 2 }, // Shadow offset (iOS)
    shadowOpacity: 0.25, // Shadow opacity (iOS)
    shadowRadius: 4, // Shadow radius (iOS)

    maxWidth: "80%", // Ensure the bubble doesn't
  },
  sentMessage: {
    alignSelf: "flex-end",

    color: "#fff", // White text
    fontSize: 12, // Slightly larger font size
    fontStyle: "italic",
    backgroundColor: "rgba(5, 81, 100, 1)", // Dark background
    borderRadius: 10, // Rounded corners for a bubble effect
    paddingHorizontal: 10, // Padding on left and right
    paddingVertical: 5, // Padding on top and bottom
    elevation: 8, // Shadow effect (Android)
    shadowColor: "#000", // Shadow color (iOS)
    shadowOffset: { width: 0, height: 2 }, // Shadow offset (iOS)
    shadowOpacity: 0.25, // Shadow opacity (iOS)
    shadowRadius: 4, // Shadow radius (iOS)

    maxWidth: "80%", // Ensure the bubble doesn't
  },
  messageText: {
    color: "#fff",
  },
  messageTimeStamp: {
    color: "#fff",
    fontSize: 5,
    fontStyle: "italic",
    backgroundColor: "rgba(5, 81, 100, 0.3)",
    borderRadius: 4,
    padding: 2,
    elevation: 6,
  },
  messageTimeStamp2: {
    color: "#fff",
    fontSize: 5,
    fontStyle: "italic",
    backgroundColor: "#222",
    borderRadius: 4,
    padding: 2,
    elevation: 6,
  },

  flatListA: {
    height: "100%",
    // backgroundColor: "green",
    width: "50%",
  },
  flatListB: {
    height: "100%",
    // backgroundColor: "coral",
    width: "50%",
  },
  quickbuttons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,

    backgroundColor: "rgba(1, 60, 75, 1)", // Dark background
  },
});

const StyledButton = styled(Button)`
  width: 100%;
  height: 40px;
`;

const StyledIconButton = styled(IconButton)`
  margin: 5px;
  position: absolute;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledIconButton2 = styled(IconButton)`
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
`;

const Container = styled.View`
  flex: 1;
`;

const ContainerSendMessage = styled.View`
  position: absolute;

  width: 100%;
  bottom: 0%;
`;

const ContainerScrollView = styled.View`
  top: 0%;
  height: 10%;
  width: 100%;
`;

const StyledTextInput = styled(TextInput)`
  background: rgba(1, 60, 75, 1);
  color: white;
`;
