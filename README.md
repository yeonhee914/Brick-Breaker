# Brick Breaker

마우스로 패들을 움직여 공을 튕기고 벽돌을 부수는 웹 게임입니다.

## 기능

- 마우스 이동으로 패들 조작
- 벽돌 1개당 5점 획득
- 공이 패들 아래로 떨어지면 게임 오버
- 게임 종료 시 최종 점수 표시
- 좌측 상단에 최고 점수, 그 오른쪽에 현재 점수 표시
- 벽돌을 모두 부수면 새 벽돌이 생성되어 게임 계속 진행
- 25초마다 공 속도 증가
- 파란 하늘과 구름 배경, 벽돌 질감 그래픽
- Firebase Realtime Database에 최고 점수 저장
- Firebase 설정이 없으면 브라우저 localStorage에 최고 점수 저장

## Firebase Realtime Database 설정

1. Firebase Console에서 프로젝트를 만듭니다.
2. Realtime Database를 만들고 데이터베이스 URL을 확인합니다.
   예: `https://brick-breaker-ea91f-default-rtdb.firebaseio.com`
3. Firebase 프로젝트 설정에서 웹 앱을 추가합니다.
4. `firebase-config.example.js`를 복사해서 `firebase-config.js` 파일을 만듭니다.
5. Firebase 웹 앱 설정 값을 `firebase-config.js`에 입력합니다.

`firebase-config.js` 예시:

```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

최고 점수는 아래 경로에 저장됩니다.

```txt
scores/brick-breaker/highScore
```

## Realtime Database Rules

Firebase Console > Realtime Database > 규칙 탭에 아래 규칙을 넣습니다.

```json
{
  "rules": {
    "scores": {
      "brick-breaker": {
        "highScore": {
          ".read": true,
          ".write": "newData.isNumber() && newData.val() >= 0 && (!data.exists() || newData.val() >= data.val())"
        }
      }
    }
  }
}
```

이 규칙은 누구나 최고 점수를 읽을 수 있게 하고, 기존 최고 점수보다 낮은 값으로 덮어쓰는 것을 막습니다.

## 실행

정적 파일이라 `index.html`을 브라우저에서 열면 바로 실행됩니다.

로컬 서버로 확인하려면 아래 명령을 사용할 수 있습니다.

```bash
npx serve .
```

## Vercel 배포

GitHub 저장소에 이 파일들을 올린 뒤 Vercel에서 해당 저장소를 Import 하면 됩니다.

- Framework Preset: Other
- Build Command: 비워두기
- Output Directory: `.`
