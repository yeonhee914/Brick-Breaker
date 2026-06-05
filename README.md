# Brick Breaker

마우스로 패들을 움직여 공을 튕기고 벽돌을 부수는 웹 게임입니다.

## 기능

- 마우스 이동으로 패들 조작
- 벽돌 1개당 5점 획득
- 공이 패들 아래로 떨어지면 게임 오버
- 게임 종료 시 최종 점수 표시
- 좌측 상단에 최고 점수, 그 오른쪽에 현재 점수 표시
- Firebase 설정이 있으면 Firestore에 최고 점수 저장
- Firebase 설정이 없으면 브라우저 localStorage에 최고 점수 저장

## 실행

정적 파일이라 `index.html`을 브라우저에서 열면 바로 실행됩니다.

로컬 서버로 확인하려면 아래 명령을 사용할 수 있습니다.

```bash
npx serve .
```

## Firebase 설정

1. Firebase Console에서 웹 앱을 만들고 Firestore Database를 활성화합니다.
2. `firebase-config.example.js`를 복사해서 `firebase-config.js` 파일을 만듭니다.
3. Firebase Console의 웹 앱 설정 값을 `firebase-config.js`에 입력합니다.
4. Firestore에는 `scores/brick-breaker` 문서가 자동으로 만들어지고 `highScore` 값이 갱신됩니다.

개발 초기에는 아래처럼 테스트 규칙을 사용할 수 있습니다. 공개 점수판이므로 실제 운영 전에는 악용 방지 로직을 추가하는 것이 좋습니다.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/brick-breaker {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

## Vercel 배포

GitHub 저장소에 이 파일들을 올린 뒤 Vercel에서 해당 저장소를 Import 하면 됩니다.

- Framework Preset: Other
- Build Command: 비워두기
- Output Directory: `.`

