# CzechMaster Android APK

## Android Studio'da ochish

### Talablar
- Android Studio Hedgehog (2023.1.1) yoki yangroq
- JDK 17
- Android SDK 34
- Kotlin 1.9+

### Qadamlar

1. **Android Studio'ni oching**
2. **"Open"** → `CzechMasterApp` papkasini tanlang
3. **Gradle sync** tugashini kuting (2-5 daqiqa)
4. **Run** (▶) tugmasini bosing yoki:
   - **Build → Build Bundle(s)/APK(s) → Build APK(s)**
5. APK fayl joylashuvi:
   ```
   app/build/outputs/apk/debug/app-debug.apk
   ```

### Loyiha tuzilmasi
```
CzechMasterApp/
├── app/
│   ├── src/main/
│   │   ├── java/com/czechmaster/app/
│   │   │   └── MainActivity.kt       ← Asosiy Activity
│   │   ├── assets/                   ← Barcha HTML/CSS/JS fayllar
│   │   │   ├── index.html
│   │   │   ├── lesson.html
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   │   ├── webview-compat.js ← WebView adapter (BIRINCHI yukladi)
│   │   │   │   └── ...
│   │   │   └── data/
│   │   ├── res/
│   │   │   ├── values/themes.xml
│   │   │   ├── values/colors.xml
│   │   │   └── values/strings.xml
│   │   └── AndroidManifest.xml
│   ├── build.gradle
│   └── proguard-rules.pro
├── build.gradle
├── settings.gradle
└── gradle.properties
```

### WebView sozlamalari
- **minSdk**: 21 (Android 5.0+)
- **targetSdk**: 34 (Android 14)
- JavaScript: ✅ yoqilgan
- DOM Storage (localStorage): ✅ yoqilgan
- File access: ✅ yoqilgan
- Hardware acceleration: ✅ yoqilgan

### Muammolar

**"Gradle sync failed"**
→ File → Invalidate Caches → Restart

**"SDK not found"**
→ Tools → SDK Manager → Android 14 (API 34) o'rnating

**"Kotlin not found"**
→ Tools → Kotlin → Configure Kotlin Plugin Updates

### Release APK (Play Store uchun)
1. Build → Generate Signed Bundle/APK
2. APK tanlang
3. Keystore yarating yoki mavjudini tanlang
4. Release → Build

### Ruxsatnomalar
- `INTERNET` — Google Fonts, onlayn materiallar
- `RECORD_AUDIO` — Speaking Practice (mikrofon)
- `VIBRATE` — Feedback vibratsiyasi
