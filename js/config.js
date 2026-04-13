// prettier-ignore
export const CARDS = [
    { id: 1, month: 1, type: "gwang", value: 20, img: "images/cards/01_gwang.jpg" },
    { id: 2, month: 1, type: "tti", value: 5, dan: 'hong', img: "images/cards/01_tti.jpg" },
    { id: 3, month: 1, type: "pi", value: 1, img: "images/cards/01_pi.jpg" },
    { id: 4, month: 1, type: "pi", value: 1, img: "images/cards/01_pi.jpg" },
    { id: 5, month: 2, type: "tti", value: 5, dan: 'hong', img: "images/cards/02_tti.jpg" },
    { id: 6, month: 2, type: "pi", value: 1, img: "images/cards/02_pi.jpg" },
    { id: 7, month: 2, type: "pi", value: 1, img: "images/cards/02_pi.jpg" },
    { id: 8, month: 2, type: "ggot", value: 10, img: "images/cards/02_ggot.jpg" },
    { id: 9, month: 3, type: "gwang", value: 20, img: "images/cards/03_gwang.jpg" },
    { id: 10, month: 3, type: "tti", value: 5, dan: 'hong', img: "images/cards/03_tti.jpg" },
    { id: 11, month: 3, type: "pi", value: 1, img: "images/cards/03_pi.jpg" },
    { id: 12, month: 3, type: "pi", value: 1, img: "images/cards/03_pi.jpg" },
    { id: 13, month: 4, type: "tti", value: 5, dan: 'cho', img: "images/cards/04_tti.jpg" },
    { id: 14, month: 4, type: "pi", value: 1, img: "images/cards/04_pi.jpg" },
    { id: 15, month: 4, type: "pi", value: 1, img: "images/cards/04_pi.jpg" },
    { id: 16, month: 4, type: "ggot", value: 10, img: "images/cards/04_ggot.jpg" },
    { id: 17, month: 5, type: "tti", value: 5, dan: 'cho', img: "images/cards/05_tti.jpg" },
    { id: 18, month: 5, type: "pi", value: 1, img: "images/cards/05_pi.jpg" },
    { id: 19, month: 5, type: "pi", value: 1, img: "images/cards/05_pi.jpg" },
    { id: 20, month: 5, type: "ggot", value: 10, img: "images/cards/05_ggot.jpg" },
    { id: 21, month: 6, type: "tti", value: 5, dan: 'cheong', img: "images/cards/06_tti.jpg" },
    { id: 22, month: 6, type: "pi", value: 1, img: "images/cards/06_pi.jpg" },
    { id: 23, month: 6, type: "pi", value: 1, img: "images/cards/06_pi.jpg" },
    { id: 24, month: 6, type: "ggot", value: 10, img: "images/cards/06_ggot.jpg" },
    { id: 25, month: 7, type: "tti", value: 5, dan: 'cho', img: "images/cards/07_tti.jpg" },
    { id: 26, month: 7, type: "pi", value: 1, img: "images/cards/07_pi.jpg" },
    { id: 27, month: 7, type: "pi", value: 1, img: "images/cards/07_pi.jpg" },
    { id: 28, month: 7, type: "ggot", value: 10, img: "images/cards/07_ggot.jpg" },
    { id: 29, month: 8, type: "gwang", value: 20, img: "images/cards/08_gwang.jpg" },
    { id: 30, month: 8, type: "pi", value: 1, img: "images/cards/08_pi.jpg" },
    { id: 31, month: 8, type: "pi", value: 1, img: "images/cards/08_pi.jpg" },
    { id: 32, month: 8, type: "ggot", value: 10, img: "images/cards/08_ggot.jpg" },
    { id: 33, month: 9, type: "tti", value: 5, dan: 'cheong', img: "images/cards/09_tti.jpg" },
    { id: 34, month: 9, type: "pi", value: 1, img: "images/cards/09_pi.jpg" },
    { id: 35, month: 9, type: "pi", value: 1, img: "images/cards/09_pi.jpg" },
    { id: 36, month: 9, type: "ggot", value: 10, img: "images/cards/09_ggot.jpg" },
    { id: 37, month: 10, type: "tti", value: 5, dan: 'cheong', img: "images/cards/10_tti.jpg" },
    { id: 38, month: 10, type: "pi", value: 1, img: "images/cards/10_pi.jpg" },
    { id: 39, month: 10, type: "pi", value: 1, img: "images/cards/10_pi.jpg" },
    { id: 40, month: 10, type: "ggot", value: 10, img: "images/cards/10_ggot.jpg" },
    { id: 41, month: 11, type: "gwang", value: 20, img: "images/cards/11_gwang.jpg" },
    { id: 42, month: 11, type: "ssangpi", value: 2, img: "images/cards/11_ssangpi.jpg" },
    { id: 43, month: 11, type: "pi", value: 1, img: "images/cards/11_pi.jpg" },
    { id: 44, month: 11, type: "pi", value: 1, img: "images/cards/11_pi.jpg" },
    { id: 45, month: 12, type: "gwang", value: 20, img: "images/cards/12_gwang.jpg" },
    { id: 46, month: 12, type: "tti", value: 5, img: "images/cards/12_tti.jpg" },
    { id: 47, month: 12, type: "ggot", value: 10, img: "images/cards/12_ggot.jpg" },
    { id: 48, month: 12, type: "ssangpi", value: 2, img: "images/cards/12_ssangpi.jpg" },
];

export const STAGES = [
    {
        id: 1,
        name: "스테이지 1",
        characterName: "소이",
        image: "images/stages/stage1/showtime_bg_stage1_01.jpg",
        showtimeImage: "images/stages/stage1/showtime_bg_stage1_08.jpg",
        initialMoney: 10000,
        moneyPerPoint: 1000,
        cost: 0,
        unlocked: true,
        collectionBonus: 50000,
        dialogues: [
            "처음 보는 얼굴이네요. 잘 부탁해요.",
            "또 오셨군요. 오늘은 이길 수 있을까요?",
            "이제 좀 알 것 같기도 해요, 당신.",
            "솔직히 기다렸어요... 조금은요.",
            "이제 저한테서 숨길 게 없겠죠?"
        ]
    },
    {
        id: 2,
        name: "스테이지 2",
        characterName: "아린",
        image: "images/stages/stage2/showtime_bg_stage2_01.jpg",
        showtimeImage: "images/stages/stage2/showtime_bg_stage2_08.jpg",
        initialMoney: 50000,
        moneyPerPoint: 5000,
        cost: 200000,
        unlocked: false,
        collectionBonus: 300000,
        dialogues: [
            "어머, 새 얼굴이다. 잘 봐요.",
            "또 왔어요? 꽤 관심이 많으신가봐요.",
            "이제 지는 것도 별로 안 부끄러워요.",
            "이렇게까지 하는 건 나 보고 싶어서죠?",
            "...이제 진짜 다 보여줬네요."
        ]
    },
    {
        id: 3,
        name: "스테이지 3",
        characterName: "나연",
        image: "images/stages/stage3/showtime_bg_stage3_01.jpg",
        showtimeImage: "images/stages/stage3/showtime_bg_stage3_08.jpg",
        initialMoney: 100000,
        moneyPerPoint: 10000,
        cost: 1000000,
        unlocked: false,
        collectionBonus: 700000,
        dialogues: [
            "인사는 이 정도로. 패나 집으세요.",
            "결국 다시 왔군요.",
            "저를 조금은 알게 됐나요?",
            "이 정도면 꽤 집요하네요, 당신.",
            "더 볼 게 없을 것 같은데... 아직도 여기 있군요."
        ]
    },
    {
        id: 4,
        name: "스테이지 4",
        characterName: "하은",
        image: "images/stages/stage4/showtime_bg_stage4_01.jpg",
        showtimeImage: "images/stages/stage4/showtime_bg_stage4_08.jpg",
        initialMoney: 200000,
        moneyPerPoint: 20000,
        cost: 2000000,
        unlocked: false,
        collectionBonus: 2000000,
        dialogues: [
            "...",
            "왜 다시 왔죠.",
            "...의외로 질기네요.",
            "이상하게 싫지 않아요, 당신.",
            "처음으로 전부 보여준 사람이에요."
        ]
    },
    {
        id: 5,
        name: "스테이지 5",
        characterName: "채아",
        image: "images/stages/stage5/showtime_bg_stage5_01.jpg",
        showtimeImage: "images/stages/stage5/showtime_bg_stage5_08.jpg",
        initialMoney: 500000,
        moneyPerPoint: 50000,
        cost: 5000000,
        unlocked: false,
        collectionBonus: 8000000,
        dialogues: [
            "오, 새로운 도전자? 재밌겠는데요.",
            "이 정도 실력이면 봐줄 만해요.",
            "당신, 꽤 끈질기네요?",
            "슬슬 진지해지려고요?",
            "완전히 넘어온 거예요, 지금."
        ]
    },
    {
        id: 6,
        name: "스테이지 6",
        characterName: "서린",
        image: "images/stages/stage6/showtime_bg_stage6_01.jpg",
        showtimeImage: "images/stages/stage6/showtime_bg_stage6_08.jpg",
        initialMoney: 1000000,
        moneyPerPoint: 100000,
        cost: 10000000,
        unlocked: false,
        collectionBonus: 20000000,
        dialogues: [
            "여기까지 오다니, 용감하네요.",
            "살아남은 것만으로도 대단해요.",
            "점점 더 깊이 들어오는군요.",
            "돌아갈 길은 없어요, 이제.",
            "내가 인정한 사람이에요, 당신은."
        ]
    },
    {
        id: 7,
        name: "스테이지 7",
        characterName: "혜화",
        image: "images/stages/stage7/showtime_bg_stage7_01.jpg",
        showtimeImage: "images/stages/stage7/showtime_bg_stage7_08.jpg",
        initialMoney: 2000000,
        moneyPerPoint: 200000,
        cost: 20000000,
        unlocked: false,
        collectionBonus: 50000000,
        dialogues: [
            "여기까지 왔군요. 놀랍네요.",
            "이 자리에 설 자격이 있는지 지켜봐야죠.",
            "...조금은 인정해요.",
            "당신, 특별한 것 같아요.",
            "이제 제 이름을 부를 자격이 있어요."
        ]
    },
    {
        id: 8,
        name: "스테이지 8",
        characterName: "봉황",
        image: "images/stages/stage8/showtime_bg_stage8_01.jpg",
        showtimeImage: "images/stages/stage8/showtime_bg_stage8_08.jpg",
        initialMoney: 5000000,
        moneyPerPoint: 500000,
        cost: 50000000,
        unlocked: false,
        collectionBonus: 100000000,
        dialogues: [
            "팔도를 돌아 여기까지. 정말인가요.",
            "여정이 길었겠군요.",
            "이곳은 아무나 올 수 없는 자리예요.",
            "당신이 화투왕에 가장 가까운 사람이에요.",
            "마지막 패까지 확인했군요. ...오래 걸렸죠."
        ]
    }
];

export const ROULETTE_ITEMS = [
    { name: "점수 2배", effect: { type: "multiplier", value: 2 } },
    { name: "쌍피 추가", effect: { type: "addSsangpi", value: 1 } },
    { name: "광 1장 추가", effect: { type: "addGwang", value: 1 } },
    { name: "승리시 점수 2배", effect: { type: "nextRoundScoreX2", value: 2 } },
    { name: "꽝!", effect: { type: "none" } },
];

export const SHOWTIME_REPLAY_COST  =  30000; // 쇼타임 재관람 비용

// 하이로우 실패 시 경매 구매 가격 (배경 1~12번)
export const BG_AUCTION_PRICES = [
     50000,   // 1
     80000,   // 2
    130000,   // 3
    200000,   // 4
    320000,   // 5
    500000,   // 6
    800000,   // 7
   1200000,   // 8
   1900000,   // 9
   3000000,   // 10
   4700000,   // 11
   7500000,   // 12
];
