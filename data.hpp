
/* ******** change name here... ********* */

String blueToothName = "lora";
byte localAddress = 0xAA; // address of this device






#define soundControlPin 32
// BLE Service and Characteristic UUIDs
#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define TEXT_CHAR_UUID "12345678-1234-5678-1234-56789abcdef1"
#define TX_CHAR_UUID "12345678-1234-5678-1234-56789abcdef2"
#define DEVICE_LOCATION_UUID "12345678-1234-5678-1234-56789abcdef3"

const int csPin = 5; // LoRa radio chip select
const int resetPin = 4; // LoRa radio reset
const int irqPin = 2;

String outgoing; // outgoing message
byte msgCount = 0; // count of outgoing messages

byte destination = 0xFF; // destination to send to
long lastSendTime = 0; // last send time
int interval = 2000; // interval between sends








unsigned long previousMillisMine = 0; // Tracks the last reset time
const unsigned long intervalMine = 20000; // 10 seconds





BLECharacteristic * pTxCharacteristic;

BLECharacteristic * pTxDeviceLocationCharacteristic;

uint8_t txValue = 0;

bool deviceConnected = false;

void sendMessage(String outgoing);
void SoundPlay(int duration);

// you can change the pin numbers to match your wiring:
// Define the RX and TX pins for Serial 2
#define RXD2 16
#define TXD2 17
#define GPS_BAUD 9600
TinyGPSPlus gps;
// Create an instance of the HardwareSerial class for Serial 2
HardwareSerial gpsSerial(2);

// Define the I2C address of your 20x4 LCD (commonly 0x27 or 0x3F)
#define LCD_ADDRESS 0x27
#define LCD_COLUMNS 20
#define LCD_ROWS 4

// Initialize the LCD
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLUMNS, LCD_ROWS);

double latitude = 0;
double longitude = 0;
float speed = 0;
float altitude = 0;
float hdop = 0;
int satellites = 0;
int year = 2024, month = 12, day = 3, hour = 14, minute = 30, second = 45;

byte satelliteIcon[8] = {
  0b00100,
  0b01010,
  0b10001,
  0b10101,
  0b10001,
  0b01010,
  0b00100,
  0b00000
};

byte speedIcon[8] = {
  0b00100,
  0b01010,
  0b10001,
  0b11111,
  0b11111,
  0b00100,
  0b00100,
  0b00100
};

byte altitudeIcon[8] = {
  0b00100,
  0b01110,
  0b10101,
  0b00100,
  0b00100,
  0b00100,
  0b01110,
  0b00000
};

byte bluetoth_icon[8] = {
  B00000,
  B00111,
  B10101,
  B01101,
  B01110,
  B10101,
  B00101,
  B00111
};


byte disconnected_icon[8] = {
  B00000,
  B10001,
  B01010,
  B00100,
  B01010,
  B10001,
  B00000,
  B00000
};


