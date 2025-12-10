// js/outdoor-state.js
// LSMS OUTDOOR 상태 모듈
// - userRole: 현재 사용자 권한 (기본값 'guest', app.js에서 로그인 후 덮어씀)
// - trees: 실외 수목 데이터 (기존 outdoor-trees.js 의 treeData 초기값)
// - getTrees(), setTrees(), isAdmin() 헬퍼 제공

(function (global) {
    const LSMS = (global.LSMS = global.LSMS || {});
    const outdoor = (LSMS.outdoor = LSMS.outdoor || {});
  
    // 1) 현재 사용자 권한 (추후 인증 모듈에서 변경 가능)
    outdoor.userRole = "guest"; // 'admin' | 'worker' | 'guest' 등
  
    // 2) 실외 수목 데이터 (기존 treeData 그대로 이동)
    outdoor.trees = [
      {
        id: "YA-001",
        species: "소나무",
        type: "교목",
        status: "양호",
        zone: "정문 A존",
        lat: 37.4645,
        lng: 127.04285,
        height: 7.2,
        dbh: 28,
        crown: 5.4,
        crown_width: 5.4,
        crown_height: null,
        planted_year: 2012,
        slope: 8,
        tilt: 4,
        root_lift: false,
        drainage: "보통",
        trunk_crack: false,
        crown_lean: "약함",
        // 토양/뿌리 상태 (위험도 계산용)
        soil_stability: "보통", // 단단함 / 보통 / 연약함
        root_condition: "없음", // 없음 / 약간 / 심함
        risk_base: 37,
        risk_instant: 37,
        risk_level: "LOW",
        history: {
          pruning: "2024-03-20",
          pest: "2024-07-11",
          fertilize: "2024-05-15",
          inspection: "2024-08-03",
          memo: "사면부 배수 점검 필요",
        },
        disease: {
          has_issue: false,
          last_date: "-",
          detail: "-",
        },
        tag_id: "RFID-A001",
        nfc_id: "NFC-A001",
        qr_id: "QR-A001",
        sensor_id: "sensor_12",
        photo_url: "",
        created_by: "LMY",
        created_at: "2024-01-05",
        updated_at: "2024-09-12",
      },
      {
        id: "YA-002",
        species: "산벚나무",
        type: "교목",
        status: "주의",
        zone: "도로변 B존",
        lat: 37.46463,
        lng: 127.04265,
        height: 6.1,
        dbh: 24,
        crown: 4.1,
        crown_width: 4.1,
        crown_height: null,
        planted_year: 2014,
        slope: 14,
        tilt: 7,
        root_lift: true,
        drainage: "불량",
        trunk_crack: false,
        crown_lean: "중간",
        soil_stability: "연약함",
        root_condition: "심함",
        risk_base: 62,
        risk_instant: 62,
        risk_level: "MOD",
        history: {
          pruning: "2024-04-15",
          pest: "2024-08-10",
          fertilize: "2024-05-02",
          inspection: "2024-09-01",
          memo: "배수 불량 + 뿌리 들림 관찰됨",
        },
        disease: {
          has_issue: true,
          last_date: "2024-08-10",
          detail: "잎 반점 + 줄기 껍질 갈라짐 관찰, 예방 방제 완료",
        },
        tag_id: "RFID-B021",
        nfc_id: "NFC-B021",
        qr_id: "QR-B021",
        sensor_id: "sensor_19",
        photo_url: "",
        created_by: "LMY",
        created_at: "2024-01-05",
        updated_at: "2024-10-12",
      },
      {
        id: "YA-003",
        species: "회양목",
        type: "관목",
        status: "양호",
        zone: "광장 C존",
        lat: 37.4644,
        lng: 127.04295,
        height: 1.1,
        dbh: 6,
        crown: 1.2,
        crown_width: 1.2,
        crown_height: null,
        planted_year: 2020,
        slope: 2,
        tilt: 1,
        root_lift: false,
        drainage: "양호",
        trunk_crack: false,
        crown_lean: "없음",
        soil_stability: "단단함",
        root_condition: "없음",
        risk_base: 20,
        risk_instant: 20,
        risk_level: "LOW",
        history: {
          pruning: "2024-04-02",
          pest: "-",
          fertilize: "2024-06-14",
          inspection: "2024-08-21",
          memo: "",
        },
        disease: {
          has_issue: false,
          last_date: "-",
          detail: "-",
        },
        tag_id: "RFID-C102",
        nfc_id: "",
        qr_id: "QR-C102",
        sensor_id: "",
        photo_url: "",
        created_by: "LMY",
        created_at: "2024-01-10",
        updated_at: "2024-07-07",
      },
    ];
  
    // 3) 헬퍼 함수들
  
    // 현재 수목 배열 반환 (참조 그대로)
    outdoor.getTrees = function () {
      return this.trees;
    };
  
    // 수목 배열 교체 (배열이 아닐 경우 빈 배열)
    outdoor.setTrees = function (newTrees) {
      this.trees = Array.isArray(newTrees) ? newTrees : [];
    };
  
    // 현재 사용자가 관리자(admin)인지 여부
    outdoor.isAdmin = function () {
      return this.userRole === "admin";
    };
  })(window);
  
  console.log("OUTDOOR STATE LOADED");