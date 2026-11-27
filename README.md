# Mikro Fraktal — GitHub Pages yaması

Bu yama, mevcut React + Vite projesini GitHub Pages üzerinde otomatik derleyip yayınlamak için gereken yapılandırmayı ekler.

## Uygulama

1. ZIP içeriğini depo ana dizinine yükleyin. `vite.config.js`, `package.json` ile aynı seviyede; `.github/workflows/deploy.yml` ise belirtilen klasör yapısında olmalıdır.
2. Mevcut `src/`, `package.json` ve `index.html` dosyalarını silmeyin.
3. GitHub deposunda **Settings → Pages → Build and deployment → Source** alanını **GitHub Actions** yapın.
4. Deponun varsayılan dalına commit gönderin. **Actions** sekmesinde `Deploy Mikro Fraktal to GitHub Pages` akışının tamamlanmasını beklemeden sayfayı yenilemeyin; yayın URL'si Pages bölümünde görünür.

## Bu yama ne yapar?

- `vite.config.js` içindeki `base: './'`, dosya yollarını göreli hale getirir. Böylece proje kök alan adında veya `/<depo-adı>/` altında açılabilir.
- Actions önce `npm install` ve `npm run build` çalıştırır.
- Yalnızca Vite'ın ürettiği `dist/` klasörü Pages'e yüklenir. Kaynak `src/main.jsx` dosyası doğrudan tarayıcıya servis edilmez.
- Yayınlama yalnızca deponun varsayılan dalında yapılır. İş akışı varsayılan dalı otomatik belirler.

## Not

İş akışı `package.json` içindeki `build` komutunu kullanır. Projenin mevcut kaynak kodu ve Fraktal hesaplama mantığı bu yamada değiştirilmemiştir.
