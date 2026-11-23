"""のぞける立体を 1つのHTMLに 組み立てる（オフラインで動く）。

使い方:
  npm i --prefix VENDOR three@0.160.0 @mediapipe/tasks-vision@0.10.14
  curl -o VENDOR/blaze_face_short_range.tflite \
    https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
  python3 tools/build_nozoki.py VENDOR
"""
import base64, os, sys
V = sys.argv[1]
nm = os.path.join(V, 'node_modules')
parts = {
  'THREE':  os.path.join(nm, 'three/build/three.module.min.js'),
  'VISION': os.path.join(nm, '@mediapipe/tasks-vision/vision_bundle.mjs'),
  'WASMJS': os.path.join(nm, '@mediapipe/tasks-vision/wasm/vision_wasm_internal.js'),
  'WASM':   os.path.join(nm, '@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm'),
  'MODEL':  os.path.join(V, 'blaze_face_short_range.tflite'),
}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = open(os.path.join(root, 'src/nozoki.src.html'), encoding='utf-8').read()
for k, path in parts.items():
    data = open(path, 'rb').read()
    if k == 'VISION':  # ソースマップの行は 外す（ファイルが無いので）
        data = b'\n'.join(l for l in data.split(b'\n') if b'sourceMappingURL' not in l)
    h = h.replace('@@%s@@' % k, base64.b64encode(data).decode())
out = os.path.join(root, 'nozoki.html')
open(out, 'w', encoding='utf-8').write(h)
print('wrote', out, round(os.path.getsize(out)/1e6, 1), 'MB')
