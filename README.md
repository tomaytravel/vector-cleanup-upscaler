# Vector Cleanup Upscaler

Vector Cleanup Upscaler is a browser-only React web app for turning raster graphics into cleaned vector paths, re-rendering them at high resolution, removing a chosen color as transparent pixels, and exporting the result as a PNG.

## 1. 프로젝트 소개

이 프로젝트는 선화, 기하학 도형, 점/선 패턴, 아이콘형 그래픽, 단색 배경 이미지를 브라우저 안에서 정리하고 확대한 뒤 투명 PNG로 저장하는 올인원 도구입니다.

## 2. 핵심 기능

- Drag & drop 이미지 업로드
- Threshold, invert, noise reduction, simplify 조절
- `imagetracerjs` 기반 래스터 → SVG 변환
- SVG path 정리 및 작은 도형 제거
- 2x / 4x / 사용자 지정 해상도 렌더링
- 지정 색상 투명화와 tolerance 조절
- Original / Vector / Final PNG 미리보기
- 줌, eyedropper 샘플링, PNG 다운로드

## 3. 처리 파이프라인 설명

1. 사용자가 PNG/JPG/JPEG 이미지를 업로드합니다.
2. Canvas 기반 전처리로 grayscale, threshold, invert, noise cleanup을 적용합니다.
3. 전처리된 래스터를 `imagetracerjs`로 SVG path 데이터로 변환합니다.
4. SVG를 파싱해 작은 path와 불필요한 세부 점을 정리합니다.
5. 정리된 SVG를 고해상도 canvas에 렌더링하고 `pica`로 선명하게 스케일합니다.
6. 렌더링된 RGBA 비트맵에서 선택한 색상을 tolerance 기준으로 alpha 0으로 만듭니다.
7. 최종 PNG를 다운로드합니다.

## 4. 설치 방법

```bash
npm install
```

## 5. 실행 방법

```bash
npm run dev
```

브라우저에서 Vite가 안내하는 주소를 엽니다.

## 6. 빌드 방법

```bash
npm run build
npm run preview
```

## 7. GitHub Pages 배포 방법

이 프로젝트는 `vite.config.ts`에서 `base: '/vector-cleanup-upscaler/'`로 설정되어 있습니다.

1. GitHub에 `vector-cleanup-upscaler` 저장소를 생성합니다.
2. 의존성을 설치합니다.
3. 아래 명령으로 배포합니다.

```bash
npm install
npm run deploy
```

4. GitHub 저장소 설정의 Pages에서 배포 브랜치가 `gh-pages`인지 확인합니다.
5. 배포 URL은 일반적으로 아래 형태입니다.

```text
https://USER.github.io/vector-cleanup-upscaler/
```

배포 전에 로컬에서 `npm run build`가 성공하는지 확인하는 것을 권장합니다.

## 8. 사용 예시

1. 별자리 그래픽 PNG를 업로드합니다.
2. Threshold를 높여 배경과 선을 더 분리합니다.
3. Simplify를 올려 작은 노이즈 path를 줄입니다.
4. 4096 x 4096 출력으로 렌더링합니다.
5. 검은 배경이나 흰 배경 색상을 선택해 투명화합니다.
6. 최종 PNG를 다운로드합니다.

## 9. 권장 입력 이미지 유형

- 선화
- 기하학 도형
- 별자리 그래픽
- 단색 배경 PNG
- 흑백 패턴
- 아이콘형 그래픽
- 점과 선 기반 패턴

## 10. 한계점

- 사진처럼 복잡한 풀컬러 이미지는 의도한 결과가 잘 나오지 않을 수 있습니다.
- SVG path 정리는 기하 기반 휴리스틱이므로 완벽한 도형 인식은 아닙니다.
- 브라우저 메모리 한계 때문에 매우 큰 입력 이미지와 매우 큰 출력 해상도를 동시에 쓰면 느려질 수 있습니다.
- EyeDropper API는 지원 브라우저에서만 동작하며, 미지원 환경에서는 클릭 샘플링으로 대체됩니다.

## 11. 향후 개선 아이디어

- 다중 레이어 벡터화
- 색상별 path 그룹핑
- Bézier 최적화 고도화
- Web Worker 기반 비동기 처리
- 벡터 편집 핸들 추가
- SVG 다운로드 지원

