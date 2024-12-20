#include <Arduino.h>
#include <TinyGPS++.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <LoRa.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>


#include "data.hpp"


unsigned long previousMillis = 0; // Store the last time the sound was activated
const unsigned long intervalB = 1000; // Non-blocking delay duration (1000 ms)
bool soundState = false; // Track the state of the sound control





// Callback to handle received text data from bluetooth
class TextCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic * characteristic) override {
    String value = characteristic -> getValue().c_str(); // Get the written text data
    if (value.length() > 0) {
      Serial.println("Received Text Data:");
      Serial.println(value); // Print text to Serial Monitor

      Serial.println("Send to remote terminal via Lora --->>");


      if(value == "broadcast"){
        String sendData = String(latitude,6) + "," + String(longitude,6);

         // send via lora

        sendMessage(sendData);

        
      }

      else{

           // send via lora

      sendMessage(value);
        
      }


    



   

      // pTxCharacteristic -> setValue("dataRecieved !!!");
      //     pTxCharacteristic -> notify(true);

    }
  }
};

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer * pServer) {
    deviceConnected = true;
    Serial.println("connection just occured");
  };

  void onDisconnect(BLEServer * pServer) {
    deviceConnected = false;
    BLEDevice::startAdvertising();
    Serial.println("just disconnected");
    // pServer->disconnect(SERVICE_UUID);
  }
};

void initializeBLEdevice() {
  // Initialize BLE Device
  Serial.println("Starting BLE Server...");
  BLEDevice::init(blueToothName);
  BLEServer * server = BLEDevice::createServer();
  server -> setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService * service = server -> createService(SERVICE_UUID);

  //Create and configure Text Characteristic
  BLECharacteristic * textCharacteristic = service -> createCharacteristic(
    TEXT_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  textCharacteristic -> setCallbacks(new TextCallback());

  // Create and configure Voice Characteristic
  pTxCharacteristic = service -> createCharacteristic(TX_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

   pTxDeviceLocationCharacteristic = service -> createCharacteristic(DEVICE_LOCATION_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  // Start the Service
  service -> start();

  // Start advertising
  BLEAdvertising * advertising = BLEDevice::getAdvertising();
  advertising -> addServiceUUID(SERVICE_UUID);
  advertising -> setScanResponse(true);
  advertising -> setMinPreferred(0x06); // Functions for older Android versions
  advertising -> setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("BLE Server is now advertising...");
}

void loraInit() {
  Serial.println("LoRa Sender");
  Serial.println("LoRa Duplex with callback");
  // override the default CS, reset, and IRQ pins (optional)

  // pinMode(irqPin, INPUT_PULLUP);

  LoRa.setPins(csPin, resetPin, irqPin); // set CS, reset, IRQ pin


  LoRa.setGain(6);

  LoRa.setTxPower(20);
  LoRa.setSpreadingFactor(12);
  LoRa.setCodingRate4(8);
  // LoRa.setSignalBandwidth(10.4E3);

  if (!LoRa.begin(433E6)) { // initialize ratio at 915 MHz
    Serial.println("LoRa init failed. Check your connections.");
    while (true); // if failed, do nothing
  }

  

    // register the receive callback
  LoRa.onReceive(onReceive);

  // put the radio into receive mode
  LoRa.receive();

  Serial.println("LoRa init succeeded.");
}

// lora sends

void sendMessage(String outgoing) {
  Serial.println(outgoing);
  LoRa.beginPacket(); // start packet
  LoRa.write(destination); // add destination address
  LoRa.write(localAddress); // add sender address
  LoRa.write(msgCount); // add message ID
  LoRa.write(outgoing.length()); // add payload length
  LoRa.print(outgoing); // add payload
  LoRa.endPacket(); // finish packet and send it
  msgCount++; // increment message ID
  outgoing = "";
}

//lora recieves

void onReceive(int packetSize) {




  if (packetSize == 0) return; // if there's no packet, return

  // read packet header bytes:
  int recipient = LoRa.read(); // recipient address
  byte sender = LoRa.read(); // sender address
  byte incomingMsgId = LoRa.read(); // incoming msg ID
  byte incomingLength = LoRa.read(); // incoming msg length

  String incoming = "";

  while (LoRa.available()) {
    incoming += (char) LoRa.read();
  }

  if (incomingLength != incoming.length()) {   // check length for error
    Serial.println("error: message length does not match length");
    return;                             // skip rest of function
  }

  // if the recipient isn't this device or broadcast,
  if (recipient != localAddress && recipient != 0xFF) {
    Serial.println("This message is not for me.");
    return; // skip rest of function
  }

  // if message is for this device, or broadcast, print details:
  Serial.println("Received from: 0x" + String(sender, HEX));
  Serial.println("Sent to: 0x" + String(recipient, HEX));
  Serial.println("Message ID: " + String(incomingMsgId));
  Serial.println("Message length: " + String(incomingLength));
  Serial.println("Message: " + incoming);
  Serial.println("RSSI: " + String(LoRa.packetRssi()));
  Serial.println("Snr: " + String(LoRa.packetSnr()));
  Serial.println();

  pTxCharacteristic -> setValue(incoming);
  pTxCharacteristic -> notify(true);


  // if (incoming != ""){
  //    SoundPlay(200);
  // }


  if(incoming =="track" || incoming =="Track" || incoming =="TRACK"){

    String coordinates = "xx,"+ String(latitude,3) + "," +String(longitude,3) + "," +String(speed);

  sendMessage(coordinates);
  
 }



  if(incoming =="alarm"){

      // Serial.println("packet recieved ..");



    
 digitalWrite(soundControlPin, HIGH); // Turn the sound off




  
 }

 else{

  digitalWrite(soundControlPin, LOW); // Turn the sound off

 }


}

void SoundPlay(int duration) {
  digitalWrite(soundControlPin, HIGH);
  delay(duration);
  digitalWrite(soundControlPin, LOW);
}

void initializeLCD() {

  // Start the LCD
  lcd.init();
  lcd.backlight(); // Turn on the backlight

  lcd.createChar(0, satelliteIcon);
  lcd.createChar(1, speedIcon);
  lcd.createChar(2, altitudeIcon);
  lcd.createChar(3, bluetoth_icon);
  lcd.createChar(4, disconnected_icon);

}

void display_introduction() {
  lcd.setCursor(0, 0); // Set the cursor to column 0, row 0
  lcd.print("Defense Coms System");

  lcd.setCursor(9, 1); // Set the cursor to column 0, row 1
  lcd.print("By");

  lcd.setCursor(7, 2); // Set the cursor to column 0, row 2
  lcd.print("Dibal");

  lcd.setCursor(7, 3);
  lcd.print(blueToothName);
}

void initializeGps() {

  // 9600 NMEA is the default baud rate for Adafruit MTK GPS's- some use 4800
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, RXD2, TXD2);
  Serial.println("Serial 2 started at 9600 baud rate");

}

uint32_t timer = millis();

void readGps() {

    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }
    if (gps.location.isUpdated()) {

      latitude = gps.location.lat();
      longitude = gps.location.lng();
      speed = gps.speed.kmph();
      altitude = gps.altitude.meters();
      satellites = gps.satellites.value();

      lcd.clear();

      // Line 1: Latitude and Longitude
      lcd.setCursor(0, 0);
      lcd.print("LAT:");
      lcd.print(gps.location.lat(), 3);
      lcd.setCursor(11, 0);
      lcd.print("LON:");
      lcd.print(gps.location.lng(), 3);

      // Line 2: Speed and Altitude
      lcd.setCursor(0, 1);
      lcd.write(1); // Speed Icon

      lcd.print(gps.speed.kmph(), 1);
      lcd.print("km/h");
      lcd.setCursor(11, 1);
      lcd.write(2); // Altitude Icon

      lcd.print(gps.altitude.meters(), 1);
      lcd.print("m");

      // Line 3: Satellites and HDOP
      lcd.setCursor(0, 2);
      lcd.write(0); // Satellite Icon
      lcd.print("SAT:");
      lcd.print(gps.satellites.value());
      lcd.setCursor(11, 2);
      lcd.print("HDOP:");
      lcd.print(gps.hdop.value() / 100.0, 1);

      lcd.setCursor(3,3);
      lcd.print("Device : ");
      lcd.print(blueToothName);

      lcd.setCursor(19, 3);
              lcd.write(3);

      // send to mobile phone...

      String deviceLocation = "yy," + String(latitude,6) +","+String(longitude,6)+"," + String(speed,1)+",";

      pTxDeviceLocationCharacteristic -> setValue(deviceLocation);
      pTxDeviceLocationCharacteristic -> notify(true);

    

    }

    
  
}








void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);

  //Initialize ble
  initializeBLEdevice();

  //Initialize lcd
  initializeLCD();
  display_introduction();

  //Initialize gps
  initializeGps();

  //Initialize LoRa

  loraInit();

  //sound Setup
  pinMode(soundControlPin,OUTPUT);
  // ledcAttach(soundControlPin, 2000, 1); // Attach buzzer pin to PWM channel 0

  SoundPlay(1000);

} // end of setup




void loop() {


  if (deviceConnected) {

      if (millis() - previousMillisMine >= 3000) {
          // Serial.println("timeed.....");

              readGps();
              
            onReceive(LoRa.parsePacket());
            LoRa.receive();

              

              previousMillisMine = millis(); // Update the last reset time


            
            }



  
  } else {

    BLEDevice::startAdvertising();
    Serial.println("Waiting for device to connect...");
    delay(1000); // Avoid flooding with too many attempts
    // lcd.setCursor(4, 3);
    // lcd.print("connect phone");
    lcd.setCursor(19, 3);
    lcd.write(4);


  }






} // end of loop