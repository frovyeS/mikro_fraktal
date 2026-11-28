# Mikro Fraktal

Tarayıcıda çalışan, hızlı ve hassas **Mandelbrot** ve **Julia** fraktal gezgini. React + Vite ile yazıldı, GitHub Pages üzerinde otomatik yayınlanır. Hem telefonda hem bilgisayarda kullanılır; açık ve koyu tema desteklenir.

## Kullanım

| Eylem | Masaüstü | Dokunmatik |
| --- | --- | --- |
| Gezin | Sürükle | Sürükle |
| Yakınlaş / uzaklaş | Tekerlek, + / − | Çimdik, alttaki + / − |
| Hızlı büyüt | Çift tık | Çift dokun |
| Julia noktası seç | Alttaki hedef simgesi (Mandelbrot'ta) | Alttaki hedef simgesi |
| Geri al | Z | Alttaki geri oku |

Ayarlar panelinde tema (Sistem, Açık, Koyu), hazır konumlar, Julia parametresi, iterasyon (otomatik veya elle), kalite, 7 renk paleti, renk yoğunluğu ve kaydırma, kayıtlı çalışmalar ve teknik bilgiler bulunur. Üst çubuktan görünümü kaydedebilir, PNG indirebilir, temayı değiştirebilirsin. Panelden **Bağlantıyı kopyala** ile tam konumu bir bağlantı olarak paylaşabilirsin.

Klavye: oklar gezin, + / − yakınlaş, 0 sıfırla, Z geri, P ayarlar, T tema.

## GitHub Pages ile yayınlama (terminal gerekmez)

1. Bu ZIP'i aç, içindeki dosya ve klasörlerin hepsini deponun ana dizinine yükle (GitHub'da **Add file → Upload files**). Aynı isimli dosyaların üzerine yazılır, bir şey silmen gerekmez.
2. **Settings → Pages → Build and deployment → Source** alanında **GitHub Actions** seçili olsun.
3. Commit et. **Actions** sekmesinde `Deploy Mikro Fraktal to GitHub Pages` akışı bitince adres Pages bölümünde görünür.

## Dosya yapısı

```
index.html              Giriş sayfası (tema ve ikon tanımları)
vite.config.js          base: './' (alan adı kökünde veya /depo-adı/ altında çalışır)
public/                 Favori ikonu, uygulama ikonları, manifest
src/main.jsx            Uygulamayı başlatır
src/App.jsx             Durum, geçmiş, tema, kayıtlar, klavye
src/style.css           Tüm stiller (açık/koyu tema, mobil alt sayfa)
src/worker.js           Fraktal hesaplama (Web Worker)
src/components/         FractalCanvas (hareketler), Inspector (ayarlar), Icons (SVG), ui
src/lib/                Paletler, işçi havuzu, biçimleme, depolama, bağlantı paylaşımı
.github/workflows/main.yml   Otomatik derleme ve yayın
```

Tüm simgeler satır içi SVG'dir; emoji kullanılmaz. Hesaplama tamamen tarayıcıda yapılır, veri dışarı gönderilmez.
