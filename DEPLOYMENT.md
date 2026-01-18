# Deployment Təlimatları

## Node.js Versiyası Problemi

Serverdə npm install zamanı `node: command not found` xətası alırsınızsa, aşağıdakı addımları izləyin:

### 1. Node.js Versiyasını Seçin

```bash
# Serverdə aşağıdakı komandları icra edin:

# Nodenv-də mövcud versiyaları görün
nodenv versions

# Node.js 22 versiyasını seçin
nodenv local 22

# Və ya global olaraq
nodenv global 22

# Nodenv-i yeniləyin
nodenv rehash
```

### 2. Node.js Versiyasını Yoxlayın

```bash
node --version
# Nəticə: v22.x.x olmalıdır

npm --version
# Nəticə: npm versiyası göstərilməlidir
```

### 3. Dependencies-ləri Quraşdırın

```bash
# Server qovluğuna keçin
cd server

# Node modules-ləri silin (əgər varsa)
rm -rf node_modules package-lock.json

# Dependencies-ləri yenidən quraşdırın
npm install
```

### 4. Əgər Hələ də Problem Varsa

```bash
# Nodenv shell hook-u yoxlayın
echo 'eval "$(nodenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Və ya
echo 'eval "$(nodenv init -)"' >> ~/.zshrc
source ~/.zshrc

# Yenidən cəhd edin
cd server
npm install
```

### 5. bcrypt Problemi

Əgər bcrypt quraşdırılarkən problem varsa:

```bash
# Build tools quraşdırın
sudo apt-get update
sudo apt-get install -y build-essential python3

# Yenidən cəhd edin
npm install
```

## Deprecated Paketlər

Aşağıdakı xəbərdarlıqlar normaldır və təhlükə yaratmır:
- `inflight@1.0.6` - köhnə paket, amma işləyir
- `npmlog@5.0.1` - köhnə paket, amma işləyir
- `rimraf@3.0.2` - köhnə paket, amma işləyir
- `react-beautiful-dnd@13.1.1` - deprecated, amma işləyir

Bu paketlər dependency-lərdə istifadə olunur və təhlükə yaratmır.

## Server Konfiqurasiyası

### Environment Variables

Serverdə aşağıdakı environment variables-ları təyin edin:

```bash
# .env faylı yaradın
nano server/.env
```

```env
PORT=4548
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Serveri Başlatmaq

```bash
cd server
npm start
```

Və ya production üçün:

```bash
NODE_ENV=production node server.js
```

## Əlavə Qeydlər

- `.node-version` faylı artıq yaradılıb və Node.js 22 versiyasını göstərir
- Serverdə nodenv istifadə olunursa, avtomatik olaraq düzgün versiya seçiləcək
- Əgər nodenv yoxdursa, Node.js 22 versiyasını manual quraşdırın

