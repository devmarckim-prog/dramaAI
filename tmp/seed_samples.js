const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const samples = [
  {
    id: 'sample-arena',
    title: '디렉터즈 아레나',
    data: {
      id: "sample-arena",
      era: "현대 (2024년)",
      pct: 100,
      ppl: [
        {
          item: "최신형 스마트폰",
          scene: "재헌의 촬영장 모니터링 씬",
          revenue: 50000000,
          industry: "IT/가전"
        },
        {
          item: "기능성 에너지 드링크",
          scene: "편집실 밤샘 작업 씬",
          revenue: 30000000,
          industry: "식음료"
        },
        {
          item: "디자이너 브랜드 협찬",
          scene: "서영의 투자자 미팅 씬",
          revenue: 45000000,
          industry: "패션"
        },
        {
          item: "프리미엄 커피 브랜드",
          scene: "스튜디오 카페 아침 씬",
          revenue: 25000000,
          industry: "식음료"
        },
        {
          item: "노트북 컴퓨터",
          scene: "편집팀 작업 장면",
          revenue: 55000000,
          industry: "IT/가전"
        },
        {
          item: "명품 시계 브랜드",
          scene: "서영의 비즈니스 미팅 씬",
          revenue: 40000000,
          industry: "패션/액세서리"
        }
      ],
      genre: "로맨틱 코미디",
      stats: {
        net: 3600000000,
        ppl: 1200000000,
        budget: 4800000000,
        budgetBreakdown: [
          { ep: 1, budget: 620000000 },
          { ep: 2, budget: 580000000 },
          { ep: 3, budget: 550000000 },
          { ep: 4, budget: 650000000 },
          { ep: 5, budget: 590000000 },
          { ep: 6, budget: 600000000 },
          { ep: 7, budget: 610000000 },
          { ep: 8, budget: 600000000 }
        ]
      },
      title: "디렉터즈 아레나",
      status: "done",
      target: "25~35세 직장인·콘텐츠 종사자",
      logline: "전직 스튜디오 룰루랄라 PD 조재헌과 전직 PPL 대행사 대표 오서영 - 감각 vs 전략, 이야기 vs 숫자. 완전히 다른 두 사람이 숏폼 오디션 프로그램을 함께 만들며 매일 충돌하고, 그 충돌 속에서 서로가 서로의 빠진 조각임을 알아가는 로맨스.",
      runtime: 60,
      setting: "서울 마포구 합정동 아레나 스튜디오 외",
      episodes: [
        {
          story: "과거 스타 PD였던 재헌과 잘나가던 대행사 대표 서영이 공동대표로 만나게 된다. 첫 만남부터 제작 방식을 두고 크게 싸우지만, 당장 제작비가 급한 상황에서 울며 겨자 먹기로 손을 잡는다.",
          title: "1화: 불협화음의 시작",
          ending: "서로 절대로 안 맞을 거라 확신하며 돌아서는 찰나, 투자사로부터 \"두 사람이 같이 안 하면 투자 못 한다\"는 통보를 동시에 받는다.",
          scenes: [
            { num: 1, desc: "재헌과 서영의 최악의 첫만남. 계약조건을 두고 설전을 벌임.", time: "낮", place: "INT. 아레나 스튜디오 - 낮" },
            { num: 2, desc: "각자 술을 마시며 상대방 뒷담화를 하다가 우연히 마주치고 외면함.", time: "저녁", place: "EXT. 합정동 거리 - 저녁" },
            { num: 3, desc: "한태오가 두 사람 사이를 중재하려다 실패. 투자사 대표와의 긴급 전화 회의 장면.", time: "밤", place: "INT. 스튜디오 사무실 - 밤" }
          ],
          episode: 1
        },
        {
          story: "본격적인 오디션 기획에 착수한다. 재헌은 출연자의 사연을 강조하고 싶어 하고, 서영은 조회수가 나올만한 자극적인 구성을 요구한다. 한태오의 중재로 묘안을 찾아내려 노력한다.",
          title: "2화: 숫자와 감성 사이",
          ending: "재헌이 숨겨왔던 과거의 비밀 프로젝트 파일을 서영이 발견하게 된다.",
          scenes: [
            { num: 1, desc: "화이트보드를 가득 채운 서영의 데이터와 재헌의 콘셉트 드로잉이 충돌함. 감정적인 갈등이 절정.", time: "낮", place: "INT. 회의실 - 오전" },
            { num: 2, desc: "서영이 퇴근하려다 재헌의 컴퓨터에서 의문의 폴더를 열어봄.", time: "밤", place: "INT. 대표실 - 밤" },
            { num: 3, desc: "태오가 두 대표의 타협점을 찾는 새로운 기획안을 제시.", time: "새벽", place: "INT. 편집실 - 새벽" }
          ],
          episode: 2
        },
        {
          story: "드디어 <아레나>의 첫 번째 예심이 시작된다. 예상치 못한 빌런 참가자의 등장으로 촬영장은 아수라장이 되고, 서영은 이를 노이즈 마케팅으로 이용하려 하지만 재헌은 참가자의 인권을 보호해야 한다며 맞선다.",
          title: "3화: 첫 번째 오디션",
          ending: "빌런 참가자가 재헌에게 폭언을 퍼붓고, 뜻밖에도 서영이 재헌을 대신해 참가자에게 시원하게 일갈한다.",
          scenes: [
            { num: 1, desc: "심사위원들과 참가자들 사이의 팽팽한 긴장감과 돌발 상황.", time: "낮", place: "INT. 오디션 세트장 - 낮" },
            { num: 2, desc: "서영이 참가자를 몰아세우며 재헌을 방어하는 의외의 모습.", time: "저녁", place: "INT. 복도 - 저녁" },
            { num: 3, desc: "사건 이후 촬영장에서 보내는 시간. 서로를 바라보는 눈이 조금씩 달라짐.", time: "밤", place: "INT. 라운지 - 밤" }
          ],
          episode: 3
        },
        {
          story: "라이벌 이다인이 정식 등장하면서 상황이 복잡해진다. 이다인은 재헌의 감각을 칭찬하며 유혹하고, 서영은 불안감에 휩싸인다. 한편 프로젝트의 평가 시점이 다가오며 긴장감이 고조된다.",
          title: "4화: 라이벌의 출현",
          ending: "서영이 이다인과 우연히 조우하고, 과거의 기억이 되살아난다.",
          scenes: [
            { num: 1, desc: "경쟁사 이다인이 아레나 스튜디오를 방문. 재헌을 향한 노골적인 친근감.", time: "낮", place: "INT. 아레나 스튜디오 로비 - 낮" },
            { num: 2, desc: "서영의 불안정한 감정 상태.", time: "오후", place: "INT. 여자 화장실 - 오후" },
            { num: 3, desc: "투자사 대표와의 미팅. 성과 압박이 가중됨.", time: "저녁", place: "INT. 회의실 - 저녁" },
            { num: 4, desc: "서영이 엘리베이터에서 이다인과 만남.", time: "저녁", place: "INT. 엘리베이터 - 저녁" }
          ],
          episode: 4
        },
        {
          story: "이다인의 방해 공작이 본격화된다. 그녀는 재헌에게 과거 프로젝트의 실패에 대해 놀리기 시작하고, 동시에 자신의 플랫폼을 통해 공격적인 마케팅을 펼친다. 재헌은 흔들리기 시작하고, 서영은 자신이 감당해야 할 몫이 생겼음을 느낀다.",
          title: "5화: 균열",
          ending: "재헌과 서영이 처음으로 진정한 싸움을 한다. 재헌이 \"너는 지금 날 믿는 거야?\"라고 묻는다.",
          scenes: [
            { num: 1, desc: "이다인의 독설로 상처받은 재헌.", time: "밤", place: "INT. 편집실 - 밤" },
            { num: 2, desc: "서영이 재헌의 상태를 간파.", time: "새벽", place: "INT. 스튜디오 계단 - 새벽" },
            { num: 3, desc: "대표실에서의 격렬한 대화.", time: "오전", place: "INT. 대표실 - 오전" },
            { num: 4, desc: "각자 다른 방향으로 나가는 두 사람.", time: "낮", place: "INT. 스튜디오 복도 - 낮" }
          ],
          episode: 5
        },
        {
          story: "싸움 이후 둘 사이에는 어색한 침묵이 흐른다. 하지만 프로젝트는 진행되어야 하고, 그 과정에서 진정한 이해가 시작된다. 재헌은 서영의 완벽주의 뒤에 숨겨진 상처를, 서영은 재헌의 자유로움 뒤에 숨겨진 두려움을 발견한다.",
          title: "6화: 이해",
          ending: "서영이 재헌의 과거 프로젝트 파일을 다시 본다.",
          scenes: [
            { num: 1, desc: "업무적으로만 대하는 두 대표.", time: "낮", place: "INT. 회의실 - 낮" },
            { num: 2, desc: "서영의 과거를 추적하는 장면.", time: "밤", place: "INT. 서영의 집 - 밤" },
            { num: 3, desc: "재헌의 옛 동료가 연락.", time: "오후", place: "INT. 카페 - 오후" },
            { num: 4, desc: "서영이 재헌의 파일을 다시 살펴봄.", time: "새벽", place: "INT. 대표실 - 새벽" }
          ],
          episode: 6
        },
        {
          story: "플랫폼의 갑질과 이다인의 공작이 동시에 터진다. 아레나는 존폐의 위기에 처한다. 이 절체절명의 순간, 재헌과 서영은 더 이상 타협하지 않기로 결정한다.",
          title: "7화: 선택",
          ending: "새로운 기획안을 들고 재헌과 서영이 투자사 앞에 선다. 손을 맞잡는다.",
          scenes: [
            { num: 1, desc: "플랫폼 대표의 갑질. 중단 요구와 예산 삭감.", time: "낮", place: "INT. 회의실 - 낮" },
            { num: 2, desc: "스튜디오 전 직원이 모여 위기 상황을 공유.", time: "낮", place: "INT. 스튜디오 라운지 - 낮" },
            { num: 3, desc: "밤새 만든 새로운 기획안.", time: "새벽", place: "INT. 편집실 - 새벽" },
            { num: 4, desc: "투자사 앞에서의 프레젠테이션.", time: "낮", place: "INT. 투자사 회의실 - 낮" }
          ],
          episode: 7
        },
        {
          story: "최종 오디션이 시작된다. 처음과는 다른 마음가짐으로 참가자들을 마주한다. 이다인의 마지막 공작이 터지지만, 이미 그들은 동요하지 않는다. 아레나는 성공하고, 두 사람은 진정한 파트너이자 사랑하는 사람임을 깨닫는다.",
          title: "8화: 아레나",
          ending: "1년 후, <아레나> 시즌 2의 기획을 함께 하고 있는 두 대표.",
          scenes: [
            { num: 1, desc: "최종 오디션 당일.", time: "낮", place: "INT. 오디션 세트장 - 낮" },
            { num: 2, desc: "이다인의 마지막 폭로 시도.", time: "낮", place: "INT. 스튜디오 - 낮" },
            { num: 3, desc: "오디션 성공 발표.", time: "저녁", place: "INT. 스튜디오 라운지 - 저녁" },
            { num: 4, desc: "파티가 끝난 후 둘만 남은 스튜디오.", time: "밤", place: "INT. 스튜디오 옥상 - 밤" },
            { num: 5, desc: "1년 후. 두 대표가 함께 시즌 2를 기획하는 모습.", time: "낮", place: "INT. 새로워진 대표실 - 낮" }
          ],
          episode: 8
        }
      ],
      platform: "OTT 오리지널",
      synopsis: "조재헌과 오서영은 각자의 영역에서 최고였으나 한순간의 실수로 바닥까지 추락한다. 두 사람은 마지막 기회로 숏폼 오디션 프로그램 <아레나>를 기획하게 된다. \"콘텐츠는 예술\"이라는 재헌과 \"콘텐츠는 상품\"이라는 서영은 매 순간 격렬하게 부딪힌다. 하지만 제작비 부족, 투자 철회 등 외부의 위기 속에서 서로의 결핍을 채워주며 진정한 파트너로 거듭난다. 그 과정에서 발견하는 것은 단순한 성공이 아닌, 서로에 대한 깊은 신뢰와 사랑이다.",
      conflicts: [
        {
          desc: "예술지상주의 PD와 데이터 중심 전략가의 크리에이티브 방향성을 둘러싼 사사건건 충돌.",
          type: "가치관 충돌",
          character: "조재헌 vs 오서영"
        },
        {
          desc: "과거 대역전극 실패에 대한 트라우마와 자신의 감각에 대한 불안함 사이의 투쟁.",
          type: "내적 갈등",
          character: "조재헌"
        },
        {
          desc: "완벽해야 한다는 강박과 처음 느끼는 재헌에 대한 낯선 감정 사이의 혼란.",
          type: "내적 갈등",
          character: "오서영"
        },
        {
          desc: "라이벌 이다인의 교묘한 방해 공작과 대형 플랫폼의 갑질로 인한 제작 중단 위기.",
          type: "외부 압박",
          character: "아레나 스튜디오 vs 이다인"
        }
      ],
      isVisible: true,
      characters: [
        {
          age: "34세", job: "전 PD / 공동대표", name: "조재헌", role: "남주", gender: "남성",
          personality: "직관과 감각으로 승부. 이야기 중심. 가끔 무모할 정도로 예술적 감수성을 앞세움.",
          looks: "캐주얼, 항상 목에 걸려있는 소니 헤드폰",
          background: "스튜디오 룰루랄라의 대표 PD였으나 대역전극 실패로 떨어짐. 그 이후 자신의 감각을 믿지 못하는 상황.",
          arc: "서영과의 만남을 통해 자신의 감각을 다시 믿게 되고, 감각과 전략의 조화를 배움."
        },
        {
          age: "32세", job: "전 대행사 대표 / 공동대표", name: "오서영", role: "여주", gender: "여성",
          personality: "숫자와 전략으로 승부. 완벽주의. 감정보다 효율을 중요시하는 냉철한 전략가.",
          looks: "세련된 오피스룩, 흐트러짐 없는 단발",
          background: "대행사 대표였으나 한 건의 실패로 좌절. 완벽함으로 모든 것을 통제하려 함.",
          arc: "재헌을 만나면서 감정의 가치를 깨닫고, 완벽함 대신 진정함을 선택하게 됨."
        },
        {
          age: "28세", job: "막내 PD", name: "한태오", role: "조연", gender: "남성",
          personality: "MZ 감각의 소유자. 엉뚱하지만 유행의 흐름을 본능적으로 읽어내는 아이디어맨.",
          looks: "트렌디한 스트릿 패션",
          background: "두 대표보다 한 세대 아래. 현재 감각과 미래 트렌드에 민감함.",
          arc: "두 대표의 충돌을 관찰하면서 성장. 마지막 위기에서 핵심 아이디어를 제시."
        },
        {
          age: "29세", job: "경쟁사 PM", name: "이다인", role: "조연", gender: "여성",
          personality: "서영의 라이벌. 과거 서영에게 밀린 트라우마가 있음. 재헌의 감각을 이용해 서영을 곤란하게 만들려 함.",
          looks: "화려하고 도발적인 스타일",
          background: "서영과는 대행사에서 경쟁 관계였음. 서영에게 밀려난 후 현재 경쟁사로 이직. 복수심 강함.",
          arc: "재헌을 유혹하고 서영을 괴롭히려 했으나, 결국 둘의 진정성 앞에 패배."
        }
      ],
      themes: [
        "감각과 전략의 조화",
        "완벽함과 진정함",
        "예술과 상품성의 경계",
        "혼자가 아닌 함께",
        "상처에서 성장으로"
      ],
      marketingAngle: "감성+재미+로맨스. 업계인들이 공감할 수 있는 현실적 고민, 그 속에서 피어나는 치명적인 케미스트리.",
      createdAt: '2024.03.27',
      stepIdx: 7
    }
  },
  {
    id: 'sample-seoul',
    title: '서울의 밤 (Seoul Night)',
    data: {
      id: 'sample-seoul',
      title: '서울의 밤 (Seoul Night)',
      platform: '글로벌 OTT',
      genre: '범죄 스릴러',
      episodes: 12,
      runtime: 50,
      era: '현대 (2024년)',
      target: '30~45세 장르물 마니아',
      setting: '서울 도심 및 강남 뒷골목',
      logline: '낮에는 평범한 변호사지만, 밤이 되면 억울한 자들을 위해 그림자 재판국을 여는 다크 히어로의 처절한 복수극.',
      characters: [
        { role: '남주', name: '강도진', age: '35세', gender: '남성', job: '로펌 변호사', personality: '이중적, 치밀함', looks: '슈트핏' },
        { role: '여주', name: '이수연', age: '30세', gender: '여성', job: '광역수사대 형사', personality: '원칙주의자', looks: '활동복' }
      ],
      synopsis: '법이 해결하지 못한 사회악들을 자신만의 방식으로 처단하는 강도진과, 그를 쫓으면서도 그의 정의에 공감하게 되는 형사 이수연의 이야기.',
      conflicts: [
        { type: '내면의 갈등', character: '강도진', desc: '개인적 복수와 대의적 정의 사이에서의 고뇌.' },
        { type: '추격전', character: '강도진 vs 경찰', desc: '이수연의 포위망이 점점 좁혀오는 상황.' }
      ],
      stats: {
        budget: 12000000000, ppl: 2000000000, net: 10000000000,
        budgetBreakdown: [
          { ep: 1, budget: 1000000000 }, { ep: 2, budget: 1000000000 }, { ep: 3, budget: 1000000000 }, { ep: 4, budget: 1000000000 },
          { ep: 5, budget: 1000000000 }, { ep: 6, budget: 1000000000 }, { ep: 7, budget: 1000000000 }, { ep: 8, budget: 1000000000 },
          { ep: 9, budget: 1000000000 }, { ep: 10, budget: 1000000000 }, { ep: 11, budget: 1000000000 }, { ep: 12, budget: 1000000000 }
        ]
      },
      ppl: [
        { industry: '자동차', item: '다크 세단', scene: '심야 추격전', revenue: 200000000 }
      ],
      episodes: Array.from({length: 12}, (_, i) => ({ episode: i+1, title: `${i+1}화: 그림자 처판`, story: `어둠의 방식으로 범죄자를 심판.`, ending: `수사망이 점점 조여온다.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.28',
      stepIdx: 7
    }
  },
  {
    id: 'sample-chronos',
    title: '크로노스 스테이션 (SF 스릴러)',
    data: {
      id: 'sample-chronos',
      title: '크로노스 스테이션 (SF 스릴러)',
      platform: '글로벌 OTT',
      genre: 'SF, 미스터리 스릴러',
      episodes: 8,
      runtime: 45,
      era: '2088년 근미래',
      target: '20~40세 테크 마니아',
      setting: '화성 궤도 우주 연구소',
      logline: '화성 궤도의 연구소, 24시간 동안 반복되는 죽음의 루프 속에서 유일하게 기억을 간직한 기술자의 사투.',
      synopsis: '2088년, 화성 궤도의 시간 연구소 "크로노스". 실험 오류로 기지의 모든 인원이 같은 하루를 반복한다. 매일 자정마다 폭발하는 기지에서 주인공 "재욱"만이 이전 루프를 기억하며 탈출구를 찾는다.',
      characters: [
        { name: '한재욱', role: '주연', desc: '냉정하지만 트라우마를 가진 수석 엔지니어. 무한 루프의 진실을 파헤친다.', age: '35세', gender: '남성' },
        { name: '아이린', role: '주연', desc: '인간의 감정을 학습 중인 기지 제어 AI. 루프의 비밀을 안다.', age: 'AI', gender: '여성' }
      ],
      conflicts: [
        { type: '추리/미스터리', character: '한재욱 vs 시스템', desc: '루프를 강제하는 기지 중앙 통제 시스템과의 치열한 두뇌 싸움.' },
        { type: '신뢰', character: '재욱 vs 동료들', desc: '내일을 모르는 동료들을 설득하여 함께 폭발을 막아야 한다.' }
      ],
      stats: {
        budget: 16000000000, ppl: 1500000000, net: 14500000000,
        budgetBreakdown: [
          { ep: 1, budget: 2000000000 }, { ep: 2, budget: 2000000000 }, { ep: 3, budget: 2000000000 }, { ep: 4, budget: 2000000000 },
          { ep: 5, budget: 2000000000 }, { ep: 6, budget: 2000000000 }, { ep: 7, budget: 2000000000 }, { ep: 8, budget: 2000000000 }
        ]
      },
      ppl: [
        { industry: 'IT', item: '미래형 VR 고글', scene: '시스템 제어', revenue: 150000000 }
      ],
      episodes: Array.from({length: 8}, (_, i) => ({ episode: i+1, title: `${i+1}화: ${i === 0 ? '00:00:01' : '루프의 법칙'}`, story: `다시 시작되는 하루. 재욱은 폭발의 단서를 찾아 해맨다.`, ending: `실패 그리고 또 다른 하루의 시작.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.29',
      stepIdx: 7
    }
  },
  {
    id: 'sample-noir',
    title: '검은 안개 (정통 누아르)',
    data: {
      id: 'sample-noir',
      title: '검은 안개 (정통 누아르)',
      platform: '케이블TV',
      genre: '범죄, 누아르',
      episodes: 16,
      runtime: 70,
      era: '현대 (가상의 항구도시)',
      target: '30~50세 장르물 선호',
      setting: '부패한 항구 도시 성암시',
      logline: '모든 것을 잃은 전직 형사와 세상을 지배하려는 범죄 조직의 끝을 알 수 없는 추격전.',
      synopsis: '부패한 도시 "성암". 누명을 쓰고 쫓겨난 형사 대팔은 의문의 여인으로부터 자신의 가족을 죽인 진범의 위치를 전해 듣는다. 안개가 자욱한 항구 도시에서 피의 복수가 시작된다.',
      characters: [
        { name: '강대팔', role: '주연', desc: '무뚝뚝하지만 주먹 하나는 확실한 전직 강력계 형사.', age: '42세', gender: '남성' },
        { name: '유리아', role: '주연', desc: '속을 알 수 없는 팜므파탈. 대팔을 안갯속으로 끌어들인다.', age: '29세', gender: '여성' }
      ],
      conflicts: [
        { type: '복수', character: '강대팔 vs 범죄조직', desc: '배후를 찾아 하나씩 처단해나가는 강대팔의 여정.' },
        { type: '배신', character: '대팔 vs 옛 동료', desc: '과거 형사 시절 믿었던 동료들의 배신과 부패.' }
      ],
      stats: {
        budget: 9600000000, ppl: 800000000, net: 8800000000,
        budgetBreakdown: [
          { ep: 1, budget: 600000000 }, { ep: 2, budget: 600000000 }, { ep: 3, budget: 600000000 }, { ep: 4, budget: 600000000 },
          { ep: 5, budget: 600000000 }, { ep: 6, budget: 600000000 }, { ep: 7, budget: 600000000 }, { ep: 8, budget: 600000000 },
          { ep: 9, budget: 600000000 }, { ep: 10, budget: 600000000 }, { ep: 11, budget: 600000000 }, { ep: 12, budget: 600000000 },
          { ep: 13, budget: 600000000 }, { ep: 14, budget: 600000000 }, { ep: 15, budget: 600000000 }, { ep: 16, budget: 600000000 }
        ]
      },
      ppl: [
        { industry: '주류', item: '프리미엄 위스키', scene: '바에서 리아와의 만남', revenue: 80000000 }
      ],
      episodes: Array.from({length: 16}, (_, i) => ({ episode: i+1, title: `${i+1}화: ${i === 0 ? '돌아온 유령' : '위험한 거래'}`, story: `복수를 향해 한 걸음씩 다가가는 대팔, 새로운 적과 마주친다.`, ending: `피할 수 없는 전면전의 시작.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.30',
      stepIdx: 7
    }
  }
];

async function seed() {
  console.log('--- 🚀 Seeding Rich Admin Samples ---');
  try {
    for (const s of samples) {
      await pool.query(
        'INSERT INTO samples (id, title, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, title = EXCLUDED.title',
        [s.id, s.title, s.data]
      );
      console.log(`✅ Seeded: ${s.id}`);
    }
    console.log('--- ✨ Seed Finished Correctly ---');
  } catch (err) {
    console.error('❌ Seed Failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
