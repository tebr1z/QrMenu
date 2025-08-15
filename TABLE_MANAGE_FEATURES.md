# Masa İdarəsi Yeni Xüsusiyyətlər

## Əlavə edilən funksionallıqlar:

### 1. Local Storage Dəstəyi
- Səhifə yeniləndikdə menyu məlumatları local storage-da saxlanılır
- Backend ilə əlaqə kəsildikdə də məlumatlar itmir
- Səhifə yenidən açıldıqda məlumatlar bərpa olunur

### 2. Real-time Timer
- Masa başladıqdan sonra hər saniyə yenilənən sayğac
- Format: HH:MM:SS (saat:dəqiqə:saniyə)
- Timer məlumatları backend-ə hər 30 saniyədə bir yazılır

### 3. Səsli Bildirim Sistemi 🆕
- **1 saat tamam olduqda**: Gur səsli bildirim (3 tonlu alarm)
- **Pulsuz vaxt bitdikdə**: Fərqli səsli bildirim (2 tonlu alarm)
- Səslər Web Audio API ilə yaradılır və çox gur çıxır
- Hər bildirim yalnız bir dəfə çalınır (təkrarlanmır)

### 4. Vizual Bildirim Sistemi 🆕
- **Normal aktiv vaxt**: Mavi rəngdə və yanıb-sönən effekt
- **45+ dəqiqə**: Narıncı rəngdə uyarı
- **60 dəqiqə**: Qırmızı rəngdə və yanıb-sönən animasiya
- **Pulsuz vaxt bitməsinə 5 dəqiqə qalıb**: Sarı rəngdə uyarı
- **Pulsuz vaxt bitdi**: Qırmızı rəngdə və yanıb-sönən animasiya

### 5. Uzadılmış Session Müddəti 🆕
- **JWT Token müddəti**: 24 saat (əvvəl 3 gün idi)
- **Local Storage session**: 24 saat müddətində avtomatik giriş
- **Səhifə yeniləndikdə**: Yenidən giriş etməyə ehtiyac yoxdur
- **Session status indicator**: Aktiv session göstəricisi
- **Cookie + LocalStorage**: Həm cookie, həm də localStorage ilə session idarəsi
- **Development-friendly**: Cookie problemi olduqda localStorage əsaslı session

### 6. Təkmilləşdirilmiş Details Səhifəsi
- **Əvvəlki dizayn**: Sadə və funksional məhsul səhifəsi
- **Axtarış funksiyası**: Məhsulları axtarmaq üçün axtarış sahəsi
- **Responsive dizayn**: Bütün cihazlarda yaxşı görünür

### 7. Backend İnteqrasiyası
- Mənü əlavə etmə/silmə əməliyyatları backend-ə də yazılır
- Timer məlumatları backend-də saxlanılır
- Session məlumatları real-time yenilənir

### 8. Təkmilləşdirilmiş Bildiriş Sistemi
- Mənü əlavə edildikdə/silindikdə bildiriş göstərilir
- Local storage və backend əməliyyatları haqqında məlumat verilir
- Xəta halında istifadəçiyə məlumat verilir
- Fərqli bildiriş növləri üçün fərqli rənglər

## İstifadə qaydası:

1. **Masa Başlatma**: "Başlat" düyməsinə basın
2. **Mənü Əlavə Etmə**: Açılan siyahıdan məhsul seçin
3. **Mənü Silmə**: Məhsul yanındakı zibil qutusu ikonuna basın
4. **Session Bitirmə**: "Bitir" düyməsinə basın və hesabı görün
5. **Səsli Bildirimlər**: 1 saat və ya pulsuz vaxt bitdikdə avtomatik səs çıxacaq
6. **Uzadılmış Session**: 24 saat müddətində səhifə yeniləndikdə yenidən giriş etməyə ehtiyac yoxdur
7. **Details Səhifəsi**: Sadə və funksional məhsul səhifəsi

## Texniki detallar:

- **Local Storage Key**: `table_manage_temp_data`
- **Session Storage Key**: `admin_session_data`
- **Timer Update Interval**: 1 saniyə (frontend), 30 saniyə (backend)
- **Session Duration**: 24 saat (JWT token və local storage)
- **Audio System**: Web Audio API (Oscillator + GainNode)
- **Sound Types**: 
  - 1 saat bildirimi: Sawtooth waveform, 3 ton
  - Pulsuz vaxt bildirimi: Square waveform, 2 ton
- **Backend Routes**: 
  - `PUT /tablesession/:id/menu` - mənü yeniləmə
  - `PUT /tablesession/:id/timer` - timer yeniləmə
- **Data Persistence**: Həm local storage, həm də backend-də saxlanılır
- **Notification Types**: info (yaşıl), warning (sarı), error (qırmızı)
- **Visual Effects**: Glow animation, pulse animation, distinct colors
- **UI Framework**: Tailwind CSS with custom animations
- **Responsive Design**: Mobile-first approach 