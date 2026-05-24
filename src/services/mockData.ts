import type { Candidate, Scorecard } from '../types';

export const MOCK_MIDFIELDERS: Candidate[] = [
    {
        id: '1', name: 'Zinedine Zidane', seed: 1,
        bio: 'Consistently ranked among the greatest players in the history of the sport, a playmaker of supreme elegance and technique.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Zinedine_Zidane_by_Tasnim_03.jpg',
    },
    {
        id: '2', name: 'Andrés Iniesta', seed: 2,
        bio: 'The soft-spoken genius who scored Spain\'s 2010 World Cup-winning goal and defined Barcelona\'s legendary tiki-taka era.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Andr%C3%A9s_Iniesta_%28cropped%29.jpg',
    },
    {
        id: '3', name: 'Xavi Hernández', seed: 3,
        bio: 'The metronome of tiki-taka, a passing genius who dictated the tempo of the greatest Barcelona and Spain teams in history.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Xavi_Hern%C3%A1ndez_-_002_%28cropped%29.jpg',
    },
    {
        id: '4', name: 'Andrea Pirlo', seed: 4,
        bio: 'The epitome of cool, a deep-lying playmaker who strolled through matches with effortless grace and laser-accurate long passes.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/20150616_-_Portugal_-_Italie_-_Gen%C3%A8ve_-_Andrea_Pirlo_%28cropped%29.jpg',
    },
    {
        id: '5', name: 'Luka Modrić', seed: 5,
        bio: 'The ageless Croatian wizard who broke the Messi-Ronaldo Ballon d\'Or monopoly and led his country to legendary World Cup runs.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Luka_Modri%C4%87_in_2018.jpg',
    },
    {
        id: '6', name: 'Michel Platini', seed: 6,
        bio: 'The dominant European midfielder of the 1980s, a prolific goalscorer and three-time consecutive Ballon d\'Or winner.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Michel_Platini_2010_%28cropped%29.jpg',
    },
    {
        id: '7', name: 'Ronaldinho', seed: 7,
        bio: 'The ultimate entertainer who played with a constant smile and brought joy, samba, and jaw-dropping magic to Barcelona.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Ronaldinho_in_2019.jpg',
    },
    {
        id: '8', name: 'Paul Scholes', seed: 8,
        bio: 'The silent genius of Manchester United\'s golden era, widely revered by peers as the most complete English midfielder of his generation.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/1999_FA_Cup_Final_Scholes_goal_celeb_%28cropped%29.jpg',
    },
    {
        id: '9', name: 'Steven Gerrard', seed: 9,
        bio: 'Liverpool\'s ultimate captain who could single-handedly drag his team to victory in the most dramatic European finals.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Steven_Gerrard_2018.jpg',
    },
    {
        id: '10', name: 'Frank Lampard', seed: 10,
        bio: 'Chelsea\'s all-time leading goalscorer and the most prolific goalscoring midfielder in Premier League history.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Lampard_penalty_against_Wales.png',
    },
    {
        id: '11', name: 'Patrick Vieira', seed: 11,
        bio: 'The towering, combative captain of Arsenal\'s legendary \'Invincibles\' who combined physical power with technical grace.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Patrick_Vieira.jpg',
    },
    {
        id: '12', name: 'Roy Keane', seed: 12,
        bio: 'The fiery, uncompromising captain of Manchester United who demanded perfection and led by ferocious example.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Roy_keane_2014.jpg',
    },
    {
        id: '13', name: 'Toni Kroos', seed: 13,
        bio: 'The silent sniper whose metronomic passing precision anchored Germany\'s World Cup win and Real Madrid\'s historic UCL titles.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Toni_Kroos_Real_Madrid_2021.jpg',
    },
    {
        id: '14', name: 'Clarence Seedorf', seed: 14,
        bio: 'A tactical genius and powerhouse who remains the only player to win the Champions League with three different clubs.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Seedorf_with_Addo.jpg',
    },
    {
        id: '15', name: 'Yaya Touré', seed: 15,
        bio: 'The unstoppable Ivorian engine who combined unstoppable physical power with delicate technique to dominate for Manchester City.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Yaya_Toure_2010.jpg',
    },
    {
        id: '16', name: 'Gennaro Gattuso', seed: 16,
        bio: 'The ultimate warrior heart of AC Milan and Italy, an aggressive destroyer who lived for the tackle.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Gennaro_Gattuso_2017.jpg',
    },
];

export const MOCK_SCORECARDS: Record<string, Scorecard> = {
    '1': {
        battleCry: 'The pitch is my canvas, the ball my brush.',
        bio: 'Zinedine Zidane was the ultimate elegant maestro. Possessing peerless first touch, ball control, and spatial awareness, he dominated Juventus, Real Madrid, and the French national team, winning the 1998 World Cup and 2002 Champions League with legendary volley goals.',
        attributes: [
            { label: 'Strength', value: 'Supreme Elegance & Technique', sentiment: 'positive' },
            { label: 'Weakness', value: 'Volatile Temper', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, EURO, 3× UCL, 3× Ballon d\'Or', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Classic Number 10 / Playmaker', sentiment: 'neutral' },
        ],
    },
    '2': {
        battleCry: 'I play to make my teammates shine.',
        bio: 'Andrés Iniesta was the silent magician of Spain and Barcelona\'s golden generation. Unbelievably agile in tight spaces and possessing a telepathic understanding of the game, he won 4 Champions Leagues and scored the iconic winning goal in the 2010 World Cup Final.',
        attributes: [
            { label: 'Strength', value: 'Dribbling in Tight Spaces', sentiment: 'positive' },
            { label: 'Weakness', value: 'Lack of Goalscoring Volume', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, 2× EURO, 4× UCL, 9× La Liga', sentiment: 'neutral' },
            { label: 'Play Style', value: 'El Ilusionista / Mezzala', sentiment: 'neutral' },
        ],
    },
    '3': {
        battleCry: 'He who has the ball, has the game.',
        bio: 'Xavi Hernández was the undisputed orchestrator of FC Barcelona and the Spanish national team\'s golden era. Known for his legendary 360-degree vision and flawless short-passing accuracy, he controlled the tempo of matches, winning a World Cup and 4 Champions Leagues.',
        attributes: [
            { label: 'Strength', value: '360° Vision & Passing', sentiment: 'positive' },
            { label: 'Weakness', value: 'Physical Strength', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, 2× EURO, 4× UCL, 8× La Liga', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Tiki-Taka Conductor / Regista', sentiment: 'neutral' },
        ],
    },
    '4': {
        battleCry: 'I think, therefore I play.',
        bio: 'Andrea Pirlo redefined the defensive midfield role as a deep-lying playmaker. Operating with sublime composure, he dictated matches for AC Milan, Juventus, and Italy, winning two Champions Leagues and the 2006 World Cup with his trademark pinpoint long balls and free-kicks.',
        attributes: [
            { label: 'Strength', value: 'Laser Long-Passing & FKs', sentiment: 'positive' },
            { label: 'Weakness', value: 'Defensive Work Rate', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, 2× UCL, 6× Serie A', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Deep-Lying Playmaker / Regista', sentiment: 'neutral' },
        ],
    },
    '5': {
        battleCry: 'Never stop running, never stop believing.',
        bio: 'Luka Modrić is the engine of Real Madrid\'s modern Champions League dynasty. The Croatian mastermind possesses an extraordinary work ethic, elite outside-of-the-foot trivela passes, and led a small nation to the 2018 World Cup final, earning the Ballon d\'Or.',
        attributes: [
            { label: 'Strength', value: 'Trivela & Stamina', sentiment: 'positive' },
            { label: 'Weakness', value: 'Aerial Duels', sentiment: 'negative' },
            { label: 'Trophies', value: 'Ballon d\'Or, 6× UCL, WC Runner-up', sentiment: 'neutral' },
            { label: 'Play Style', value: 'All-Phase Midfield Engine', sentiment: 'neutral' },
        ],
    },
    '6': {
        battleCry: 'Winning is a habit, scoring is an art.',
        bio: 'Michel Platini was the crown jewel of French and European football in the 1980s. A highly prolific attacking midfielder with extraordinary free-kick technique and passing vision, he won three consecutive Ballon d\'Or awards and single-handedly carried France to Euro 1984 glory.',
        attributes: [
            { label: 'Strength', value: 'Goalscoring & Free Kicks', sentiment: 'positive' },
            { label: 'Weakness', value: 'Defensive Contribution', sentiment: 'negative' },
            { label: 'Trophies', value: '3× Ballon d\'Or, EURO 84, UCL', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Attacking Maestro / Le Roi', sentiment: 'neutral' },
        ],
    },
    '7': {
        battleCry: 'Football is about joy and improvisation.',
        bio: 'Ronaldinho was the ultimate footballing entertainer. Playing with a constant smile, he combined spectacular dribbling skills, jaw-dropping free kicks, and overhead kicks at FC Barcelona, winning the 2002 World Cup and the 2005 Ballon d\'Or while getting applauded by rival fans.',
        attributes: [
            { label: 'Strength', value: 'Joga Bonito Magic & Dribbling', sentiment: 'positive' },
            { label: 'Weakness', value: 'Career Longevity', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, Ballon d\'Or, UCL, Copa America', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Samba Attacking Midfielder', sentiment: 'neutral' },
        ],
    },
    '8': {
        battleCry: 'Let your feet do the talking.',
        bio: 'Paul Scholes was the brain of Sir Alex Ferguson\'s Manchester United dynasty. Renowned for his metronomic passing, late runs into the box, and explosive long-range volleys, he was called the \'greatest midfielder of the last 20 years\' by peers like Zidane and Xavi.',
        attributes: [
            { label: 'Strength', value: 'Lethal Long Shots & Passing', sentiment: 'positive' },
            { label: 'Weakness', value: 'Tackling Timing', sentiment: 'negative' },
            { label: 'Trophies', value: '11× Premier League, 2× UCL', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Metronomic Deep Playmaker', sentiment: 'neutral' },
        ],
    },
    '9': {
        battleCry: 'We go again. Believe in the miracle.',
        bio: 'Steven Gerrard was the heartbeat of Liverpool Football Club. Capable of playing anywhere, he possessed explosive speed, thunderous long-range shooting, and an iron will, famously leading the Miracle of Istanbul comeback in the 2005 Champions League final.',
        attributes: [
            { label: 'Strength', value: 'Thunderous Long Shots & Leadership', sentiment: 'positive' },
            { label: 'Weakness', value: 'Tactical Discipline', sentiment: 'negative' },
            { label: 'Trophies', value: 'UCL, 2× FA Cup, UEFA Cup', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Dynamic Box-to-Box Force', sentiment: 'neutral' },
        ],
    },
    '10': {
        battleCry: 'Hard work beats talent every single day.',
        bio: 'Frank Lampard redefined the goalscoring midfielder role, scoring an astonishing 211 goals for Chelsea. Renowned for his incredible stamina, intelligence, and unmatched ability to make late, perfectly timed runs into the penalty box, he won 3 Premier League titles and the Champions League.',
        attributes: [
            { label: 'Strength', value: 'Late Penalty Box Runs', sentiment: 'positive' },
            { label: 'Weakness', value: 'Dribbling in Tight Spaces', sentiment: 'negative' },
            { label: 'Trophies', value: '3× PL, UCL, 4× FA Cup', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Goalscoring Midfield Raider', sentiment: 'neutral' },
        ],
    },
    '11': {
        battleCry: 'If you want to win, you must dominate.',
        bio: 'Patrick Vieira was the engine and captain of Arsenal\'s legendary \'Invincibles\' side. Combining immense physical stature and aggressive tackling with surprising technical elegance and box-to-box athleticism, he dominated midfields and won the 1998 World Cup with France.',
        attributes: [
            { label: 'Strength', value: 'Physical Dominance & Ball Carrier', sentiment: 'positive' },
            { label: 'Weakness', value: 'Disciplinary Record', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, EURO, 3× PL, 5× Serie A', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Powerhouse Box-to-Box Captain', sentiment: 'neutral' },
        ],
    },
    '12': {
        battleCry: 'Fail to prepare, prepare to fail.',
        bio: 'Roy Keane was the ultimate leader and enforcer of Sir Alex Ferguson\'s Manchester United. Famed for his uncompromising tenacity, aggressive tackling, and unmatched mental strength, his legendary performance against Juventus in 1999 dragged United to the Treble.',
        attributes: [
            { label: 'Strength', value: 'Ferocious Leadership & Tackling', sentiment: 'positive' },
            { label: 'Weakness', value: 'Combative Temper', sentiment: 'negative' },
            { label: 'Trophies', value: '7× Premier League, UCL', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Aggressive Ball-Winning Leader', sentiment: 'neutral' },
        ],
    },
    '13': {
        battleCry: 'Precision over power, always.',
        bio: 'Toni Kroos was the definition of German precision. Nicknamed \'Querpass-Toni\' early on but revered as one of the most efficient players ever, his flawless passing accuracy and cool composure guided Germany to the 2014 World Cup and Real Madrid to 5 Champions League crowns.',
        attributes: [
            { label: 'Strength', value: 'Flawless Passing Accuracy', sentiment: 'positive' },
            { label: 'Weakness', value: 'Pace & Agility', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, 6× UCL, 4× La Liga', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Metronomic Deep Playmaker', sentiment: 'neutral' },
        ],
    },
    '14': {
        battleCry: 'Football is played with the mind.',
        bio: 'Clarence Seedorf was a complete, tactical powerhouse of European football. Blessed with incredible strength, ball retention, and tactical intelligence, he achieved the historic feat of winning 4 Champions League titles across 3 different giant clubs: Ajax, Real Madrid, and AC Milan.',
        attributes: [
            { label: 'Strength', value: 'Tactical Intelligence & Strength', sentiment: 'positive' },
            { label: 'Weakness', value: 'Inconsistent Goalscoring', sentiment: 'negative' },
            { label: 'Trophies', value: '4× UCL (3 different clubs), 2× Serie A', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Complete Multi-Club Maestro', sentiment: 'neutral' },
        ],
    },
    '15': {
        battleCry: 'If there is no path, I will bulldoze one.',
        bio: 'Yaya Touré was a box-to-box juggernaut during Manchester City\'s rise to dominance. At his peak, he combined freight-train physical power with delicate free kicks and dribbling, scoring an unbelievable 20 Premier League goals in the 2013-14 season and winning 4 AFCON Player of the Year awards.',
        attributes: [
            { label: 'Strength', value: 'Freight-Train Power & Shooting', sentiment: 'positive' },
            { label: 'Weakness', value: 'Defensive Work Rate', sentiment: 'negative' },
            { label: 'Trophies', value: '3× PL, UCL, AFCON', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Unstoppable Attacking Force', sentiment: 'neutral' },
        ],
    },
    '16': {
        battleCry: 'I don\'t need skills, I have soul.',
        bio: 'Gennaro Gattuso was the ultimate defensive warrior. Serving as the aggressive shield for Andrea Pirlo at AC Milan and Italy, \'Ringhio\' compensated for his lack of elegant technique with relentless energy, fierce slide tackles, and a passion that powered Italy\'s 2006 World Cup win.',
        attributes: [
            { label: 'Strength', value: 'Aggressive Interceptions & Grit', sentiment: 'positive' },
            { label: 'Weakness', value: 'Technical Playmaking', sentiment: 'negative' },
            { label: 'Trophies', value: 'WC, 2× UCL, 2× Serie A', sentiment: 'neutral' },
            { label: 'Play Style', value: 'Ferocious Midfield Destroyer', sentiment: 'neutral' },
        ],
    },
};

export const getMockScorecards = (candidates: Candidate[]): Record<string, Scorecard> => {
    const result: Record<string, Scorecard> = {};
    for (const c of candidates) {
        // Look up by candidate's database seed index or id first, then by name
        const mockKey = Object.keys(MOCK_SCORECARDS).find(
            key => key === c.id || MOCK_SCORECARDS[key].bio.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(MOCK_MIDFIELDERS[Number(key) - 1]?.name.toLowerCase())
        );
        
        result[c.id] = mockKey ? MOCK_SCORECARDS[mockKey] : {
            battleCry: `Fear the might of ${c.name}!`,
            bio: `${c.name} is a legendary midfielder stepping into this arena. Possessing unparalleled spirit, unique tactical assets, and solid backing from its supporters, it is prepared to conquer all matchups in this tournament bracket.`,
            attributes: [
                { label: 'Strength', value: 'Iron Will', sentiment: 'positive' },
                { label: 'Weakness', value: 'Overconfidence', sentiment: 'negative' },
                { label: 'Specialty', value: 'Crowd Favourite', sentiment: 'neutral' },
                { label: 'Hype Level', value: 'Over 9000', sentiment: 'neutral' },
            ],
        };
    }
    return result;
};
