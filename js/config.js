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
        name: "초보 도박사",
        image: "images/stages/stage1/showtime_bg_stage1_01.jpg",
        showtimeImage: "images/stages/stage1/showtime_bg_stage1_08.jpg",
        initialMoney: 10000,
        cost: 0,
        unlocked: true
    },
    {
        id: 2,
        name: "타짜",
        image: "images/stages/stage2/showtime_bg_stage2_01.jpg",
        showtimeImage: "images/stages/stage2/showtime_bg_stage2_08.jpg",
        initialMoney: 50000,
        cost: 200000,
        unlocked: false
    },
    {
        id: 3,
        name: "전설의 꾼",
        image: "images/stages/stage3/showtime_bg_stage3_01.jpg",
        showtimeImage: "images/stages/stage3/showtime_bg_stage3_08.jpg",
        initialMoney: 100000,
        cost: 1000000,
        unlocked: false
    },
    {
        id: 4,
        name: "신의 경지",
        image: "images/stages/stage4/showtime_bg_stage4_01.jpg",
        showtimeImage: "images/stages/stage4/showtime_bg_stage4_08.jpg",
        initialMoney: 200000,
        cost: 2000000,
        unlocked: false
    }
];

export const ROULETTE_ITEMS = [
    { name: "점수 2배", effect: { type: "multiplier", value: 2 } },
    { name: "쌍피 추가", effect: { type: "addSsangpi", value: 1 } },
    { name: "광 1장 추가", effect: { type: "addGwang", value: 1 } },
    { name: "승리시 점수 2배", effect: { type: "nextRoundScoreX2", value: 2 } },
    { name: "꽝!", effect: { type: "none" } },
];

export const SHOWTIME_RESPIN_COST = 100000; // 쇼타임 룰렛 재시도 비용
