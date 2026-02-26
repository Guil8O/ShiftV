/**
 * 이미지 최적화 가이드 스크립트
 * 
 * 이 스크립트는 이미지 최적화 가이드를 제공합니다.
 * 실제 이미지 변환을 위해서는 별도의 도구가 필요합니다.
 */

console.log('\n🎨 ShiftV 이미지 최적화 가이드\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📁 현재 이미지 파일 현황:\n');
console.log('  assets/     : PNG 이미지 파일들');
console.log('  android/    : Android 아이콘 (48~512px)');
console.log('  ios/        : iOS 아이콘 (16~1024px)');
console.log('  windows11/  : Windows 11 타일 아이콘\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 권장 최적화 방법:\n');

console.log('1️⃣  온라인 도구 사용 (가장 간편)');
console.log('   • Squoosh: https://squoosh.app/');
console.log('   • TinyPNG: https://tinypng.com/');
console.log('   • WebP 변환: https://cloudconvert.com/png-to-webp\n');

console.log('2️⃣  명령줄 도구 사용 (배치 처리)');
console.log('   # ImageMagick 설치 (Windows)');
console.log('   > winget install ImageMagick.ImageMagick\n');
console.log('   # PNG → WebP 변환');
console.log('   > magick mogrify -format webp -quality 85 assets/*.png\n');
console.log('   # 또는 cwebp 사용');
console.log('   > npm install -g cwebp-bin');
console.log('   > cwebp -q 85 input.png -o output.webp\n');

console.log('3️⃣  Node.js 라이브러리 사용');
console.log('   > npm install sharp --save-dev');
console.log('   그 후 아래 코드를 사용:\n');
console.log(`   const sharp = require('sharp');
   sharp('input.png')
     .webp({ quality: 85 })
     .toFile('output.webp');\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 최적화 체크리스트:\n');
console.log('  [ ] assets/ 폴더의 PNG 파일들을 WebP로 변환');
console.log('  [ ] 원본 PNG는 백업 폴더로 이동');
console.log('  [ ] HTML/CSS에서 <picture> 태그로 WebP + PNG fallback 적용');
console.log('  [ ] Android/iOS 아이콘은 PNG 유지 (호환성)');
console.log('  [ ] 변환 후 이미지 품질 확인');
console.log('  [ ] 로딩 속도 개선 확인 (DevTools Network 탭)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🎯 적용 예시 (HTML):\n');
console.log(`  <!-- 기존 -->
  <img src="./assets/Good.png" alt="Good">

  <!-- 최적화 후 -->
  <picture>
    <source srcset="./assets/Good.webp" type="image/webp">
    <img src="./assets/Good.png" alt="Good" loading="lazy">
  </picture>\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📊 예상 개선 효과:\n');
console.log('  • 이미지 용량: 30-50% 감소');
console.log('  • 로딩 속도: 20-40% 개선');
console.log('  • Lighthouse 점수: +5~10점\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💾 자동화 스크립트가 필요하면 아래 패키지를 설치하세요:');
console.log('   > npm install sharp --save-dev\n');
console.log('그 후 이 파일을 수정하여 자동 변환 로직을 추가할 수 있습니다.\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✨ 최적화를 완료하면 다음 단계로 진행하세요!\n');
