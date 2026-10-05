/**
 * Geometry and SVG path definitions for the ornamental shape variants.
 *
 * All coordinates are normalized in a standard 400x260 coordinate box by default,
 * and dynamically adapt to actual width, height, and inner outline gap.
 *
 * Each shape provides:
 * - leftPath: Starts at top apex (X_MID, Y_TOP) and traces down the LEFT half to (X_MID, Y_BOTTOM)
 * - rightPath: Starts at top apex (X_MID, Y_TOP) and traces down the RIGHT half to (X_MID, Y_BOTTOM)
 * - fullPath: Closed outer perimeter (for fill & static outlines)
 * - innerLeftPath, innerRightPath, innerFullPath: Delicate concentric double-border frame
 */

export interface OrnamentShapeData {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly leftPath: string;
  readonly rightPath: string;
  readonly fullPath: string;
  readonly innerLeftPath: string;
  readonly innerRightPath: string;
  readonly innerFullPath: string;
}

export const ORNAMENT_SHAPES: readonly OrnamentShapeData[] = [
  {
    id: "arch-window",
    label: "Kubah Lengkung (Arch Window)",
    description: "Kubah lengkung elegan seperti bingkai jendela katedral dengan garis mengalir dari puncak atas ke bawah.",
    leftPath:
      "M 200 10 C 110 10, 30 60, 30 120 L 30 240 C 30 248, 40 250, 60 250 L 200 250",
    rightPath:
      "M 200 10 C 290 10, 370 60, 370 120 L 370 240 C 370 248, 360 250, 340 250 L 200 250",
    fullPath:
      "M 200 10 C 290 10, 370 60, 370 120 L 370 240 C 370 248, 360 250, 340 250 L 200 250 L 60 250 C 40 250, 30 248, 30 240 L 30 120 C 30 60, 110 10, 200 10 Z",
    innerLeftPath:
      "M 200 22 C 118 22, 44 68, 44 122 L 44 238 C 44 242, 50 244, 64 244 L 200 244",
    innerRightPath:
      "M 200 22 C 282 22, 356 68, 356 122 L 356 238 C 356 242, 350 244, 336 244 L 200 244",
    innerFullPath:
      "M 200 22 C 282 22, 356 68, 356 122 L 356 238 C 356 242, 350 244, 336 244 L 200 244 L 64 244 C 50 244, 44 242, 44 238 L 44 122 C 44 68, 118 22, 200 22 Z",
  },
  {
    id: "circle",
    label: "Lingkaran (Circle)",
    description: "Bentuk bulat simetris sempurna dengan alur garis melengkung lembut mengalir dari atas ke bawah.",
    leftPath:
      "M 200 15 A 115 115 0 0 0 200 245",
    rightPath:
      "M 200 15 A 115 115 0 0 1 200 245",
    fullPath:
      "M 200 15 A 115 115 0 0 1 200 245 A 115 115 0 0 1 200 15 Z",
    innerLeftPath:
      "M 200 27 A 103 103 0 0 0 200 233",
    innerRightPath:
      "M 200 27 A 103 103 0 0 1 200 233",
    innerFullPath:
      "M 200 27 A 103 103 0 0 1 200 233 A 103 103 0 0 1 200 27 Z",
  },
  {
    id: "oval",
    label: "Oval (Elips)",
    description: "Bentuk lonjong oval halus klasik yang anggun membingkai ruang undangan.",
    leftPath:
      "M 200 15 A 180 115 0 0 0 200 245",
    rightPath:
      "M 200 15 A 180 115 0 0 1 200 245",
    fullPath:
      "M 200 15 A 180 115 0 0 1 200 245 A 180 115 0 0 1 200 15 Z",
    innerLeftPath:
      "M 200 27 A 168 103 0 0 0 200 233",
    innerRightPath:
      "M 200 27 A 168 103 0 0 1 200 233",
    innerFullPath:
      "M 200 27 A 103 103 0 0 1 200 233 A 103 103 0 0 1 200 27 Z",
  },
  {
    id: "rectangle",
    label: "Persegi Panjang (Box)",
    description: "Bingkai sudut tegak lurus modern dan presisi dengan garis melingkari tepi kartu.",
    leftPath:
      "M 200 12 L 12 12 L 12 248 L 200 248",
    rightPath:
      "M 200 12 L 388 12 L 388 248 L 200 248",
    fullPath:
      "M 200 12 L 388 12 L 388 248 L 12 248 L 12 12 Z",
    innerLeftPath:
      "M 200 24 L 24 24 L 24 236 L 200 236",
    innerRightPath:
      "M 200 24 L 376 24 L 376 236 L 200 236",
    innerFullPath:
      "M 200 24 L 376 24 L 376 236 L 24 236 L 24 24 Z",
  },
  {
    id: "rounded-rect",
    label: "Persegi Membulat (Rounded Box)",
    description: "Persegi dengan sudut lengkung halus modern yang bersih dan minimalis.",
    leftPath:
      "M 200 12 L 40 12 A 28 28 0 0 0 12 40 L 12 220 A 28 28 0 0 0 40 248 L 200 248",
    rightPath:
      "M 200 12 L 360 12 A 28 28 0 0 1 388 40 L 388 220 A 28 28 0 0 1 360 248 L 200 248",
    fullPath:
      "M 200 12 L 360 12 A 28 28 0 0 1 388 40 L 388 220 A 28 28 0 0 1 360 248 L 40 248 A 28 28 0 0 1 12 220 L 12 40 A 28 28 0 0 1 40 12 Z",
    innerLeftPath:
      "M 200 24 L 42 24 A 18 18 0 0 0 24 42 L 24 218 A 18 18 0 0 0 42 236 L 200 236",
    innerRightPath:
      "M 200 24 L 358 24 A 18 18 0 0 1 376 42 L 376 218 A 18 18 0 0 1 358 236 L 200 236",
    innerFullPath:
      "M 200 24 L 358 24 A 18 18 0 0 1 376 42 L 376 218 A 18 18 0 0 1 358 236 L 42 236 A 18 18 0 0 1 24 218 L 24 42 A 18 18 0 0 1 42 24 Z",
  },
  {
    id: "notched-bracket",
    label: "Sudut Cekung (Vintage Plaque)",
    description: "Plakat klasik dengan sudut cekung ke dalam dan bingkai ganda elegan.",
    leftPath:
      "M 200 12 L 64 12 C 40 32, 28 48, 20 72 L 20 188 C 28 212, 40 228, 64 248 L 200 248",
    rightPath:
      "M 200 12 L 336 12 C 360 32, 372 48, 380 72 L 380 188 C 372 212, 360 228, 336 248 L 200 248",
    fullPath:
      "M 200 12 L 336 12 C 360 32, 372 48, 380 72 L 380 188 C 372 212, 360 228, 336 248 L 200 248 L 64 248 C 40 228, 28 212, 20 188 L 20 72 C 28 48, 40 32, 64 12 Z",
    innerLeftPath:
      "M 200 22 L 72 22 C 52 38, 42 52, 32 74 L 32 186 C 42 208, 52 222, 72 238 L 200 238",
    innerRightPath:
      "M 200 22 L 328 22 C 348 38, 358 52, 368 74 L 368 186 C 358 208, 348 222, 328 238 L 200 238",
    innerFullPath:
      "M 200 22 L 328 22 C 348 38, 358 52, 368 74 L 368 186 C 358 208, 348 222, 328 238 L 200 238 L 72 238 C 52 222, 42 208, 32 186 L 32 74 C 42 52, 52 38, 72 22 Z",
  },
  {
    id: "baroque-crest",
    label: "Mahkota Barok (Royal Crest)",
    description: "Bentuk mahkota barok megah dengan puncak lancip dan lekukan anggun di setiap sisi.",
    leftPath:
      "M 200 8 C 175 18, 145 24, 120 18 C 95 12, 65 10, 45 24 C 25 38, 14 64, 24 92 C 32 114, 12 122, 12 130 C 12 138, 32 146, 24 168 C 14 196, 25 222, 45 236 C 65 250, 95 248, 120 242 C 145 236, 175 242, 200 252",
    rightPath:
      "M 200 8 C 225 18, 255 24, 280 18 C 305 12, 335 10, 355 24 C 375 38, 386 64, 376 92 C 368 114, 388 122, 388 130 C 388 138, 368 146, 376 168 C 386 196, 375 222, 355 236 C 335 250, 305 248, 280 242 C 255 236, 225 242, 200 252",
    fullPath:
      "M 200 8 C 225 18, 255 24, 280 18 C 305 12, 335 10, 355 24 C 375 38, 386 64, 376 92 C 368 114, 388 122, 388 130 C 388 138, 368 146, 376 168 C 386 196, 375 222, 355 236 C 335 250, 305 248, 280 242 C 255 236, 225 242, 200 252 C 175 242, 145 236, 120 242 C 95 248, 65 250, 45 236 C 25 222, 14 196, 24 168 C 32 146, 12 138, 12 130 C 12 122, 32 114, 24 92 C 14 64, 25 38, 45 24 C 65 10, 95 12, 120 18 C 145 24, 175 18, 200 8 Z",
    innerLeftPath:
      "M 200 18 C 178 26, 150 32, 128 26 C 104 22, 78 20, 60 32 C 42 44, 32 68, 40 92 C 46 112, 28 122, 28 130 C 28 138, 46 148, 40 168 C 32 192, 42 216, 60 228 C 78 240, 104 238, 128 234 C 150 228, 178 234, 200 242",
    innerRightPath:
      "M 200 18 C 222 26, 250 32, 272 26 C 296 22, 322 20, 340 32 C 358 44, 368 68, 360 92 C 354 112, 372 122, 372 130 C 372 138, 354 148, 360 168 C 368 192, 358 216, 340 228 C 322 240, 296 238, 272 234 C 250 228, 222 234, 200 242",
    innerFullPath:
      "M 200 18 C 222 26, 250 32, 272 26 C 296 22, 322 20, 340 32 C 358 44, 368 68, 360 92 C 354 112, 372 122, 372 130 C 372 138, 354 148, 360 168 C 368 192, 358 216, 340 228 C 322 240, 296 238, 272 234 C 250 228, 222 234, 200 242 C 178 234, 150 228, 128 234 C 104 238, 78 240, 60 228 C 42 216, 32 192, 40 168 C 46 148, 28 138, 28 130 C 28 122, 46 112, 40 92 C 32 68, 42 44, 60 32 C 78 20, 104 22, 128 26 C 150 32, 178 26, 200 18 Z",
  },
  {
    id: "wavy-cartouche",
    label: "Pita Bergelombang (Rococo Waves)",
    description: "Pigura bergelombang ritmis ala Rococo dengan alur dinamis yang simetris dan artistik.",
    leftPath:
      "M 200 12 C 185 18, 170 22, 155 18 C 140 14, 125 8, 110 12 C 95 16, 80 22, 65 18 C 45 14, 24 30, 22 54 C 20 78, 36 104, 26 130 C 16 156, 20 182, 22 206 C 24 230, 45 246, 65 242 C 80 238, 95 244, 110 248 C 125 252, 140 246, 155 242 C 170 238, 185 242, 200 248",
    rightPath:
      "M 200 12 C 215 18, 230 22, 245 18 C 260 14, 275 8, 290 12 C 305 16, 320 22, 335 18 C 355 14, 376 30, 378 54 C 380 78, 364 104, 374 130 C 384 156, 380 182, 378 206 C 376 230, 355 246, 335 242 C 320 238, 305 244, 290 248 C 275 252, 260 246, 245 242 C 230 238, 215 242, 200 248",
    fullPath:
      "M 200 12 C 215 18, 230 22, 245 18 C 260 14, 275 8, 290 12 C 305 16, 320 22, 335 18 C 355 14, 376 30, 378 54 C 380 78, 364 104, 374 130 C 384 156, 380 182, 378 206 C 376 230, 355 246, 335 242 C 320 238, 305 244, 290 248 C 275 252, 260 246, 245 242 C 230 238, 215 242, 200 248 C 185 242, 170 238, 155 242 C 140 246, 125 252, 110 248 C 95 244, 80 238, 65 242 C 45 246, 24 230, 22 206 C 20 182, 16 156, 26 130 C 36 104, 20 78, 22 54 C 24 30, 45 14, 65 18 C 80 22, 95 16, 110 12 C 125 8, 140 14, 155 18 C 170 22, 185 18, 200 12 Z",
    innerLeftPath:
      "M 200 22 C 187 27, 173 30, 160 27 C 147 24, 133 19, 120 22 C 107 25, 94 30, 81 27 C 65 24, 46 37, 36 57 C 34 77, 47 101, 39 124 C 31 147, 34 171, 36 193 C 46 213, 65 226, 81 223 C 94 220, 107 225, 120 228 C 133 231, 147 226, 160 223 C 173 220, 187 223, 200 228",
    innerRightPath:
      "M 200 22 C 213 27, 227 30, 240 27 C 253 24, 267 19, 280 22 C 293 25, 306 30, 319 27 C 335 24, 354 37, 364 57 C 366 77, 353 101, 361 124 C 369 147, 366 171, 364 193 C 354 213, 335 226, 319 223 C 306 220, 293 225, 280 228 C 267 231, 253 226, 240 223 C 227 220, 213 223, 200 228",
    innerFullPath:
      "M 200 22 C 213 27, 227 30, 240 27 C 253 24, 267 19, 280 22 C 293 25, 306 30, 319 27 C 335 24, 354 37, 364 57 C 366 77, 353 101, 361 124 C 369 147, 366 171, 364 193 C 354 213, 335 226, 319 223 C 306 220, 293 225, 280 228 C 267 231, 253 226, 240 223 C 227 220, 213 223, 200 228 C 187 223, 173 220, 160 223 C 147 226, 133 231, 120 228 C 107 225, 94 220, 81 223 C 65 226, 46 213, 36 193 C 34 171, 31 147, 39 124 C 47 101, 34 77, 36 57 C 46 37, 65 24, 81 27 C 94 30, 107 25, 120 22 C 133 19, 147 24, 160 27 C 173 30, 187 27, 200 22 Z",
  },
  {
    id: "royal-plaque",
    label: "Plakat Oval Kerajaan (Smooth Plaque)",
    description: "Plakat lengkung halus gaya kerajaan dengan kuping membulat dan pinggang berlekuk lembut.",
    leftPath:
      "M 200 10 C 160 10, 120 16, 90 24 C 72 29, 58 38, 48 50 C 32 70, 22 85, 28 105 C 34 118, 34 142, 28 155 C 22 175, 32 190, 48 210 C 58 222, 72 231, 90 236 C 120 244, 160 250, 200 250",
    rightPath:
      "M 200 10 C 240 10, 280 16, 310 24 C 328 29, 342 38, 352 50 C 368 70, 378 85, 372 105 C 366 118, 366 142, 372 155 C 378 175, 368 190, 352 210 C 342 222, 328 231, 310 236 C 280 244, 240 250, 200 250",
    fullPath:
      "M 200 10 C 240 10, 280 16, 310 24 C 328 29, 342 38, 352 50 C 368 70, 378 85, 372 105 C 366 118, 366 142, 372 155 C 378 175, 368 190, 352 210 C 342 222, 328 231, 310 236 C 280 244, 240 250, 200 250 C 160 250, 120 244, 90 236 C 72 231, 58 222, 48 210 C 32 190, 22 175, 28 155 C 34 142, 34 118, 28 105 C 22 85, 32 70, 48 50 C 58 38, 72 29, 90 24 C 120 16, 160 10, 200 10 Z",
    innerLeftPath:
      "M 200 20 C 165 20, 130 25, 102 32 C 86 36, 74 44, 65 54 C 52 70, 42 82, 48 98 C 53 112, 53 138, 48 152 C 42 168, 52 180, 65 196 C 74 206, 86 214, 102 218 C 130 225, 165 230, 200 230",
    innerRightPath:
      "M 200 20 C 235 20, 270 25, 298 32 C 314 36, 326 44, 335 54 C 348 70, 358 82, 352 98 C 347 112, 347 138, 352 152 C 358 168, 348 180, 335 196 C 326 206, 314 214, 298 218 C 270 225, 235 230, 200 230",
    innerFullPath:
      "M 200 20 C 235 20, 270 25, 298 32 C 314 36, 326 44, 335 54 C 348 70, 358 82, 352 98 C 347 112, 347 138, 352 152 C 358 168, 348 180, 335 196 C 326 206, 314 214, 298 218 C 270 225, 235 230, 200 230 C 165 230, 130 225, 102 218 C 86 214, 74 206, 65 196 C 52 180, 42 168, 48 152 C 53 138, 53 112, 48 98 C 42 82, 52 70, 65 54 C 74 44, 86 36, 102 32 C 130 25, 165 20, 200 20 Z",
  },
  {
    id: "scalloped-stamp",
    label: "Prangko Gerigi Klasik (Scalloped Stamp)",
    description: "Bingkai tepi bergerigi halus seperti segel prangko pos vintage dengan outline ganda mewah.",
    leftPath:
      "M 200 12 C 182 12, 172 16, 154 14 C 136 12, 126 16, 108 14 C 90 12, 80 16, 62 14 C 44 14, 28 26, 22 44 C 18 62, 22 72, 18 90 C 14 108, 20 118, 16 130 C 20 142, 14 152, 18 170 C 22 188, 18 198, 22 216 C 28 234, 44 246, 62 246 C 80 244, 90 248, 108 246 C 126 244, 136 248, 154 246 C 172 244, 182 248, 200 248",
    rightPath:
      "M 200 12 C 218 12, 228 16, 246 14 C 264 12, 274 16, 292 14 C 310 12, 320 16, 338 14 C 356 14, 372 26, 378 44 C 382 62, 378 72, 382 90 C 386 108, 380 118, 384 130 C 380 142, 386 152, 382 170 C 378 188, 382 198, 378 216 C 372 234, 356 246, 338 246 C 320 244, 310 248, 292 246 C 274 244, 264 248, 246 246 C 228 244, 218 248, 200 248",
    fullPath:
      "M 200 12 C 218 12, 228 16, 246 14 C 264 12, 274 16, 292 14 C 310 12, 320 16, 338 14 C 356 14, 372 26, 378 44 C 382 62, 378 72, 382 90 C 386 108, 380 118, 384 130 C 380 142, 386 152, 382 170 C 378 188, 382 198, 378 216 C 372 234, 356 246, 338 246 C 320 244, 310 248, 292 246 C 274 244, 264 248, 246 246 C 228 244, 218 248, 200 248 C 182 248, 172 244, 154 246 C 136 248, 126 244, 108 246 C 90 248, 80 244, 62 246 C 44 246, 28 234, 22 216 C 18 198, 22 188, 18 170 C 14 152, 20 142, 16 130 C 20 118, 14 108, 18 90 C 22 72, 18 62, 22 44 C 28 26, 44 14, 62 14 C 80 16, 90 12, 108 14 C 126 16, 136 12, 154 14 C 172 16, 182 12, 200 12 Z",
    innerLeftPath:
      "M 200 24 L 68 24 C 48 24, 36 36, 36 56 L 36 204 C 36 224, 48 236, 68 236 L 200 236",
    innerRightPath:
      "M 200 24 L 332 24 C 352 24, 364 36, 364 56 L 364 204 C 364 224, 352 236, 332 236 L 200 236",
    innerFullPath:
      "M 200 24 L 332 24 C 352 24, 364 36, 364 56 L 364 204 C 364 224, 352 236, 332 236 L 200 236 L 68 236 C 48 236, 36 224, 36 204 L 36 56 C 36 36, 48 24, 68 24 Z",
  },
  {
    id: "pointed-cartouche",
    label: "Bintang Lancip Barok (Pointed Plaque)",
    description: "Plakat ornamen dengan ujung sudut meruncing simetris dan puncak dekoratif di setiap sisi.",
    leftPath:
      "M 200 8 C 170 16, 120 16, 80 18 L 52 20 C 38 20, 24 26, 16 38 C 26 65, 38 95, 32 115 L 12 130 C 32 145, 38 165, 26 195 C 24 208, 38 218, 52 220 L 80 222 C 120 224, 170 224, 200 252",
    rightPath:
      "M 200 8 C 230 16, 280 16, 320 18 L 348 20 C 362 20, 376 26, 384 38 C 374 65, 362 95, 368 115 L 388 130 C 368 145, 362 165, 374 195 C 376 208, 362 218, 348 220 L 320 222 C 280 224, 230 224, 200 252",
    fullPath:
      "M 200 8 C 230 16, 280 16, 320 18 L 348 20 C 362 20, 376 26, 384 38 C 374 65, 362 95, 368 115 L 388 130 C 368 145, 362 165, 374 195 C 376 208, 362 218, 348 220 L 320 222 C 280 224, 230 224, 200 252 C 170 224, 120 224, 80 222 L 52 220 C 38 218, 24 208, 26 195 C 38 165, 32 145, 12 130 L 32 115 C 38 95, 26 65, 16 38 C 24 26, 38 20, 52 20 L 80 18 C 120 16, 170 16, 200 8 Z",
    innerLeftPath:
      "M 200 20 C 172 26, 128 26, 92 28 L 66 30 C 52 30, 40 36, 32 46 C 42 70, 52 96, 46 116 L 28 130 C 46 144, 52 160, 42 186 C 40 198, 52 206, 66 208 L 92 210 C 128 212, 172 212, 200 240",
    innerRightPath:
      "M 200 20 C 228 26, 272 26, 308 28 L 334 30 C 348 30, 360 36, 368 46 C 358 70, 348 96, 354 116 L 372 130 C 354 144, 348 160, 358 186 C 360 198, 348 206, 334 208 L 308 210 C 272 212, 228 212, 200 240",
    innerFullPath:
      "M 200 20 C 228 26, 272 26, 308 28 L 334 30 C 348 30, 360 36, 368 46 C 358 70, 348 96, 354 116 L 372 130 C 354 144, 348 160, 358 186 C 360 198, 348 206, 334 208 L 308 210 C 272 212, 228 212, 200 240 C 172 212, 128 212, 92 210 L 66 208 C 52 206, 40 198, 42 186 C 52 160, 46 144, 28 130 L 46 116 C 52 96, 42 70, 32 46 C 40 36, 52 30, 66 30 L 92 28 C 128 26, 172 26, 200 20 Z",
  },
] as const;

export function scaleSvgPath(
  pathStr: string,
  targetW: number,
  targetH: number,
  baseW = 400,
  baseH = 260,
): string {
  if (targetW === baseW && targetH === baseH) return pathStr;
  const sx = targetW / baseW;
  const sy = targetH / baseH;

  const tokens = pathStr.trim().split(/[\s,]+/);
  const out: string[] = [];
  let isX = true;

  for (const token of tokens) {
    if (/^[MLCZ]$/i.test(token)) {
      out.push(token.toUpperCase());
      isX = true;
    } else {
      const num = Number.parseFloat(token);
      if (Number.isNaN(num)) {
        out.push(token);
      } else {
        const scaled = isX ? num * sx : num * sy;
        out.push(String(Math.round(scaled * 10) / 10));
        isX = !isX;
      }
    }
  }

  return out.join(" ");
}

/**
 * Dynamically computes an ornamental shape adapted to target width, height, and inner gap.
 */
export function getOrnamentShape(
  id?: string,
  width = 400,
  height = 260,
  innerGap = 12,
): OrnamentShapeData {
  const match = ORNAMENT_SHAPES.find((s) => s.id === id);
  const baseShape = match ?? ORNAMENT_SHAPES[0];
  if (!baseShape) throw new Error("No ornament shapes defined");

  // Fast path for standard base size and default gap
  if (width === 400 && height === 260 && innerGap === 12) {
    return baseShape;
  }

  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const gap = Math.max(2, Math.min(innerGap, Math.min(width, height) / 4));

  // Analytical generation for common and geometric shapes
  if (baseShape.id === "circle") {
    const r = Math.round(Math.min(width, height) / 2 - 12);
    const ir = Math.max(8, r - gap);
    return {
      ...baseShape,
      leftPath: `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`,
      rightPath: `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`,
      fullPath: `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z`,
      innerLeftPath: `M ${cx} ${cy - ir} A ${ir} ${ir} 0 0 0 ${cx} ${cy + ir}`,
      innerRightPath: `M ${cx} ${cy - ir} A ${ir} ${ir} 0 0 1 ${cx} ${cy + ir}`,
      innerFullPath: `M ${cx} ${cy - ir} A ${ir} ${ir} 0 0 1 ${cx} ${cy + ir} A ${ir} ${ir} 0 0 1 ${cx} ${cy - ir} Z`,
    };
  }

  if (baseShape.id === "oval") {
    const rx = Math.round(width / 2 - 12);
    const ry = Math.round(height / 2 - 12);
    const irx = Math.max(8, rx - gap);
    const iry = Math.max(8, ry - gap);
    return {
      ...baseShape,
      leftPath: `M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 0 ${cx} ${cy + ry}`,
      rightPath: `M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry}`,
      fullPath: `M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 0 1 ${cx} ${cy - ry} Z`,
      innerLeftPath: `M ${cx} ${cy - iry} A ${irx} ${iry} 0 0 0 ${cx} ${cy + iry}`,
      innerRightPath: `M ${cx} ${cy - iry} A ${irx} ${iry} 0 0 1 ${cx} ${cy + iry}`,
      innerFullPath: `M ${cx} ${cy - iry} A ${irx} ${iry} 0 0 1 ${cx} ${cy + iry} A ${irx} ${iry} 0 0 1 ${cx} ${cy - iry} Z`,
    };
  }

  if (baseShape.id === "rectangle") {
    const m = 12;
    const im = m + gap;
    return {
      ...baseShape,
      leftPath: `M ${cx} ${m} L ${m} ${m} L ${m} ${height - m} L ${cx} ${height - m}`,
      rightPath: `M ${cx} ${m} L ${width - m} ${m} L ${width - m} ${height - m} L ${cx} ${height - m}`,
      fullPath: `M ${cx} ${m} L ${width - m} ${m} L ${width - m} ${height - m} L ${m} ${height - m} L ${m} ${m} Z`,
      innerLeftPath: `M ${cx} ${im} L ${im} ${im} L ${im} ${height - im} L ${cx} ${height - im}`,
      innerRightPath: `M ${cx} ${im} L ${width - im} ${im} L ${width - im} ${height - im} L ${cx} ${height - im}`,
      innerFullPath: `M ${cx} ${im} L ${width - im} ${im} L ${width - im} ${height - im} L ${im} ${height - im} L ${im} ${im} Z`,
    };
  }

  if (baseShape.id === "rounded-rect") {
    const m = 12;
    const cr = Math.min(32, Math.max(12, Math.round(Math.min(width, height) * 0.15)));
    const im = m + gap;
    const icr = Math.max(4, cr - Math.round(gap * 0.5));
    return {
      ...baseShape,
      leftPath: `M ${cx} ${m} L ${m + cr} ${m} A ${cr} ${cr} 0 0 0 ${m} ${m + cr} L ${m} ${height - m - cr} A ${cr} ${cr} 0 0 0 ${m + cr} ${height - m} L ${cx} ${height - m}`,
      rightPath: `M ${cx} ${m} L ${width - m - cr} ${m} A ${cr} ${cr} 0 0 1 ${width - m} ${m + cr} L ${width - m} ${height - m - cr} A ${cr} ${cr} 0 0 1 ${width - m - cr} ${height - m} L ${cx} ${height - m}`,
      fullPath: `M ${cx} ${m} L ${width - m - cr} ${m} A ${cr} ${cr} 0 0 1 ${width - m} ${m + cr} L ${width - m} ${height - m - cr} A ${cr} ${cr} 0 0 1 ${width - m - cr} ${height - m} L ${m + cr} ${height - m} A ${cr} ${cr} 0 0 1 ${m} ${height - m - cr} L ${m} ${m + cr} A ${cr} ${cr} 0 0 1 ${m + cr} ${m} Z`,
      innerLeftPath: `M ${cx} ${im} L ${im + icr} ${im} A ${icr} ${icr} 0 0 0 ${im} ${im + icr} L ${im} ${height - im - icr} A ${icr} ${icr} 0 0 0 ${im + icr} ${height - im} L ${cx} ${height - im}`,
      innerRightPath: `M ${cx} ${im} L ${width - im - icr} ${im} A ${icr} ${icr} 0 0 1 ${width - im} ${im + icr} L ${width - im} ${height - im - icr} A ${icr} ${icr} 0 0 1 ${width - im - icr} ${height - im} L ${cx} ${height - im}`,
      innerFullPath: `M ${cx} ${im} L ${width - im - icr} ${im} A ${icr} ${icr} 0 0 1 ${width - im} ${im + icr} L ${width - im} ${height - im - icr} A ${icr} ${icr} 0 0 1 ${width - im - icr} ${height - im} L ${im + icr} ${height - im} A ${icr} ${icr} 0 0 1 ${im} ${height - im - icr} L ${im} ${im + icr} A ${icr} ${icr} 0 0 1 ${im + icr} ${im} Z`,
    };
  }

  if (baseShape.id === "arch-window") {
    const archH = Math.min(130, Math.max(50, Math.round(width * 0.35)));
    const yTop = 10;
    const yBot = height - 10;
    const leftX = Math.round(Math.min(30, width * 0.08));
    const rightX = width - leftX;
    const cpx = Math.round(cx - (cx - leftX) * 0.55);

    const leftPath = `M ${cx} ${yTop} C ${cpx} ${yTop}, ${leftX} ${Math.round(yTop + archH * 0.45)}, ${leftX} ${yTop + archH} L ${leftX} ${yBot - 10} C ${leftX} ${yBot - 2}, ${leftX + 10} ${yBot}, ${leftX + 30} ${yBot} L ${cx} ${yBot}`;
    const rightPath = `M ${cx} ${yTop} C ${width - cpx} ${yTop}, ${rightX} ${Math.round(yTop + archH * 0.45)}, ${rightX} ${yTop + archH} L ${rightX} ${yBot - 10} C ${rightX} ${yBot - 2}, ${rightX - 10} ${yBot}, ${rightX - 30} ${yBot} L ${cx} ${yBot}`;
    const fullPath = `M ${cx} ${yTop} C ${width - cpx} ${yTop}, ${rightX} ${Math.round(yTop + archH * 0.45)}, ${rightX} ${yTop + archH} L ${rightX} ${yBot - 10} C ${rightX} ${yBot - 2}, ${rightX - 10} ${yBot}, ${rightX - 30} ${yBot} L ${cx} ${yBot} L ${leftX + 30} ${yBot} C ${leftX + 10} ${yBot}, ${leftX} ${yBot - 2}, ${leftX} ${yBot - 10} L ${leftX} ${yTop + archH} C ${leftX} ${Math.round(yTop + archH * 0.45)}, ${cpx} ${yTop}, ${cx} ${yTop} Z`;

    const iyTop = yTop + gap;
    const iyBot = yBot - gap * 0.6;
    const ileftX = leftX + gap;
    const irightX = rightX - gap;
    const icpx = Math.round(cx - (cx - ileftX) * 0.55);

    const innerLeftPath = `M ${cx} ${iyTop} C ${icpx} ${iyTop}, ${ileftX} ${Math.round(iyTop + archH * 0.45)}, ${ileftX} ${iyTop + archH} L ${ileftX} ${iyBot - 6} C ${ileftX} ${iyBot - 2}, ${ileftX + 6} ${iyBot}, ${ileftX + 20} ${iyBot} L ${cx} ${iyBot}`;
    const innerRightPath = `M ${cx} ${iyTop} C ${width - icpx} ${iyTop}, ${irightX} ${Math.round(iyTop + archH * 0.45)}, ${irightX} ${iyTop + archH} L ${irightX} ${iyBot - 6} C ${irightX} ${iyBot - 2}, ${irightX - 6} ${iyBot}, ${irightX - 20} ${iyBot} L ${cx} ${iyBot}`;
    const innerFullPath = `M ${cx} ${iyTop} C ${width - icpx} ${iyTop}, ${irightX} ${Math.round(iyTop + archH * 0.45)}, ${irightX} ${iyTop + archH} L ${irightX} ${iyBot - 6} C ${irightX} ${iyBot - 2}, ${irightX - 6} ${iyBot}, ${irightX - 20} ${iyBot} L ${cx} ${iyBot} L ${ileftX + 20} ${iyBot} C ${ileftX + 6} ${iyBot}, ${ileftX} ${iyBot - 2}, ${ileftX} ${iyBot - 6} L ${ileftX} ${iyTop + archH} C ${ileftX} ${Math.round(iyTop + archH * 0.45)}, ${icpx} ${iyTop}, ${cx} ${iyTop} Z`;

    return {
      ...baseShape,
      leftPath,
      rightPath,
      fullPath,
      innerLeftPath,
      innerRightPath,
      innerFullPath,
    };
  }

  // Scaling fallback for vintage intricate plaques
  return {
    ...baseShape,
    leftPath: scaleSvgPath(baseShape.leftPath, width, height),
    rightPath: scaleSvgPath(baseShape.rightPath, width, height),
    fullPath: scaleSvgPath(baseShape.fullPath, width, height),
    innerLeftPath: scaleSvgPath(baseShape.innerLeftPath, width, height),
    innerRightPath: scaleSvgPath(baseShape.innerRightPath, width, height),
    innerFullPath: scaleSvgPath(baseShape.innerFullPath, width, height),
  };
}
