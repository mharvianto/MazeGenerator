# Panduan MazeGenerator

MazeGenerator membuat labirin (maze) secara animasi di browser. Anda bisa melihat langkah demi langkah cara setiap algoritma membangun labirin, lalu mencari jalur terpendek di dalamnya dengan mouse.

Langsung coba di: **https://mharvianto.github.io/MazeGenerator/**

---

## Cara menggunakan

### Kontrol di navbar

| Kontrol | Fungsi |
| --- | --- |
| **Size** | Ukuran satu sel dalam piksel (5–40). Makin besar nilainya, makin besar selnya, dan makin **sedikit** jumlah sel di layar. |
| **Algorithm** | Algoritma pembuat labirin: BFS, DFS, Prim's, atau Kruskal's. Lihat penjelasannya [di bawah](#algoritma-pembuat-labirin). |
| **Random** | Kalau aktif, urutan pembuatan labirin acak. Kalau mati, urutannya tetap dan polanya teratur. |
| **Bridge** | Kalau aktif, beberapa jalan buntu dijebol supaya labirin punya jalur memutar (sel oranye). Kalau mati, labirin "sempurna": antara dua titik hanya ada satu jalur. |
| **Speed** | Kecepatan animasi. Geser ke kanan untuk lebih cepat (sekitar 2 sampai 2000 langkah per detik). Langsung berlaku saat digeser. |
| **Reset** | Membuat labirin baru dengan pengaturan saat ini. |
| **Pause / Play** | Menghentikan atau melanjutkan animasi. |

> **Penting:** perubahan **Size, Algorithm, Random,** dan **Bridge** baru berlaku setelah menekan **Reset**. Mengubah ukuran jendela browser juga otomatis membuat labirin baru.

### Alur pemakaian

1. **Pembuatan labirin.** Labirin dibangun langkah demi langkah dari sebuah titik awal acak.
2. **Pembuatan bridge** (kalau Bridge aktif). Program menelusuri seluruh labirin dan menjebol satu dinding di setiap jalan buntu.
3. **Mode interaktif.** Setelah labirin selesai:
   - **Arahkan mouse** ke sebuah sel. Jalur terpendek dari posisi pemain (kotak biru) ke sel tersebut digambar dengan garis merah.
   - **Klik** sel tersebut. Pemain bergerak mengikuti jalur itu, dan sisa rute ditandai hijau.

### Arti warna

| Warna | Arti |
| --- | --- |
| Putih | Jalur yang sudah terbuka |
| Merah muda (kotak) | *Frontier*: sel yang menunggu diproses (tidak ditampilkan untuk Kruskal) |
| Biru | Sel yang sedang diproses, atau posisi pemain di mode interaktif |
| Oranye | *Bridge*: dinding tambahan yang dijebol untuk membuat jalur memutar |
| Merah (garis) | Jalur terpendek ke posisi mouse |
| Hijau (garis) | Sisa rute saat pemain sedang bergerak |

---

## Bagaimana labirin direpresentasikan

Layar dibagi menjadi grid. Sel yang bisa dilewati berada di koordinat **ganjil**, dan kotak di antaranya adalah **dinding**. Membuat labirin berarti memilih dinding mana yang dijebol untuk menghubungkan dua sel bersebelahan.

```
# # # # # # #        # = dinding
# o   o # o #        o = sel (koordinat ganjil)
#   #   #   #          (spasi) = dinding yang sudah dijebol
# o # o   o #
# # # # # # #
```

Labirin yang dihasilkan keempat algoritma berupa **pohon rentang** (*spanning tree*): semua sel terhubung, dan tidak ada jalur yang memutar. Jalur memutar baru muncul kalau **Bridge** aktif.

---

## Algoritma pembuat labirin

Tiga algoritma pertama (BFS, DFS, Prim's) bekerja dengan cara yang sama:

1. Buka sel awal, lalu masukkan tetangganya yang belum terbuka ke dalam **frontier**.
2. Ambil satu sel dari frontier, buka sel itu beserta dinding yang menghubungkannya ke sel asalnya, lalu masukkan tetangganya yang belum terbuka ke frontier.
3. Ulangi sampai frontier kosong.

Yang membedakan ketiganya hanyalah **sel mana yang diambil dari frontier**, yaitu jenis struktur data yang dipakai.

### Breadth-first search (BFS)

- **Frontier:** antrian (*queue*), FIFO. Sel yang paling lama menunggu diambil lebih dulu.
- **Hasil:** labirin tumbuh merata ke segala arah dari titik awal, seperti gelombang. Jalurnya cenderung pendek dan bercabang banyak di sekitar titik awal.

### Depth-first search (DFS)

- **Frontier:** tumpukan (*stack*), LIFO. Sel yang paling baru dimasukkan diambil lebih dulu.
- **Hasil:** labirin menjalar jauh ke satu arah sebelum berbalik, sehingga terbentuk **lorong-lorong panjang** dengan sedikit cabang. Labirin seperti ini biasanya terasa paling sulit.

### Prim's

- **Frontier:** antrian prioritas (*priority queue*). Setiap sel di frontier diberi bobot acak, dan yang bobotnya terkecil diambil lebih dulu.
- **Hasil:** labirin tumbuh dari titik awal ke arah acak, dengan banyak cabang pendek dan jalan buntu. Ini adalah versi acak dari algoritma Prim untuk *minimum spanning tree*.

### Kruskal's

Kruskal tidak menumbuhkan labirin dari satu titik.

1. Setiap dinding di antara dua sel diberi bobot acak, lalu semuanya dimasukkan ke antrian prioritas.
2. Dinding diambil satu per satu mulai dari bobot terkecil. Kalau dua sel di kedua sisinya **belum terhubung**, dinding dijebol. Kalau sudah terhubung, dinding dilewati supaya tidak terbentuk jalur memutar.
3. Pengecekan "sudah terhubung atau belum" memakai struktur data **union-find** (*disjoint set*), sehingga cepat.

- **Hasil:** banyak potongan labirin kecil muncul di seluruh layar sekaligus, lalu perlahan menyatu menjadi satu. Teksturnya mirip Prim's: banyak cabang pendek.

### Ringkasan

| Algoritma | Struktur data | Cara tumbuh | Ciri labirin |
| --- | --- | --- | --- |
| BFS | Queue | Merata dari titik awal | Jalur pendek, banyak cabang dekat titik awal |
| DFS | Stack | Menjalar jauh, lalu berbalik | Lorong panjang, sedikit cabang |
| Prim's | Priority queue (bobot acak) | Dari titik awal ke arah acak | Banyak cabang pendek dan jalan buntu |
| Kruskal's | Priority queue + union-find | Di seluruh layar sekaligus | Mirip Prim's |

### Kalau Random dimatikan

Semua bobot acak diganti nomor urut, jadi tetangga dan dinding selalu diproses dengan urutan yang sama:

- **BFS:** menyebar dari titik awal dengan pola yang teratur.
- **DFS:** menjadi lorong panjang berkelok yang selalu mencoba arah yang sama lebih dulu.
- **Prim's:** hasilnya **sama persis dengan BFS**, karena tanpa bobot acak Prim selalu mengambil sel yang paling lama menunggu.
- **Kruskal's:** dinding diproses berurutan dari kiri atas ke kanan bawah, sehingga terbentuk pola seperti sisir.

Posisi titik awal **tetap acak**, jadi labirin bisa tetap berbeda setiap kali di-Reset.

---

## Bridge: membuat jalur memutar

Kalau **Bridge** aktif, setelah labirin selesai program menelusuri semua sel. Setiap **jalan buntu**, yaitu sel yang hanya punya satu jalan keluar, dijebol satu dinding lain secara acak ke sel tetangganya. Dinding yang dijebol ini ditandai **oranye**.

Hasilnya labirin tidak lagi berupa pohon: ada lebih dari satu jalur antara dua titik, dan jalan buntunya jauh berkurang.

---

## Pencarian jalur terpendek

Di mode interaktif, program menghitung **jarak dari posisi pemain ke setiap sel** dengan algoritma **Dijkstra**. Karena setiap langkah berbobot sama (1), hasilnya sama dengan BFS.

Saat mouse diarahkan ke sebuah sel, jalur dibentuk dengan berjalan dari sel tujuan ke tetangga yang jaraknya selalu lebih kecil, sampai tiba di posisi pemain. Jalur ini dijamin terpendek, termasuk saat ada bridge. Setiap kali pemain berpindah, jarak dihitung ulang dari posisi barunya.

---

## Menjalankan secara lokal

Butuh Node.js (versi 24 dipakai di CI).

```bash
npm install
npm run dev       # server pengembangan di http://localhost:5173
npm run build     # build produksi ke folder dist/
npm run preview   # menjalankan hasil build
```

Setiap push ke branch `master` otomatis di-deploy ke GitHub Pages. Lihat [README.md](README.md) untuk pengaturan awalnya.
