const fs = require('fs');
const path = require('path');

// ─── Component Tag Maps ─────────────────────────────────────────────
const T = {
  C: ['Card','Card','卡','卡'],
  L: ['Column','Col','列','列'],
  R: ['Row','Row','排','排'],
  F: ['Form','Form','域','域'],
  T: ['Text','Text','文','文'],
  I: ['Image','Img','图','图'],
  B: ['Button','Btn','按','按'],
  N: ['Input','Input','入','入'],
  S: ['Select','Select','选','选'],
  X: ['Checkbox','Checkbox','选框','选框'],
  G: ['Toggle','Tog','切','切'],
  K: ['Link','Link','链','链'],
  V: ['NavBar','Nav','栏','栏'],
  D: ['Badge','Badge','标','标'],
  O: ['Toast','Toast','提','提'],
  A: ['Avatar','Avt','头像','头像'],
};

// Enum value maps
const E = {
  lv: { default:['default','default','默认','默认'], subtle:['subtle','subtle','淡','淡'] },
  tv: { title:['title','title','标题','标题'], heading:['heading','heading','主标题','主标题'],
        body:['body','body','正文','正文'], price:['price','price','价格','价格'],
        'section-title':['section-title','sec-title','节标题','节标题'], caption:['caption','caption','说明','说明'] },
  bv: { primary:['primary','p','主','主'], secondary:['secondary','s','次','次'], ghost:['ghost','g','轻','轻'] },
  iv: { info:['info','info','信息','信息'], success:['success','s','成功','成功'],
        warning:['warning','warning','警告','警告'], danger:['danger','danger','危险','危险'], error:['error','error','错误','错误'] },
  sz: { small:['small','s','小','小'], medium:['medium','m','中','中'], large:['large','l','大','大'] },
  sh: { square:['square','square','方','方'], circle:['circle','circle','圆','圆'] },
  it: { text:['text','text','文','文'], email:['email','email','邮箱','邮箱'],
        password:['password','password','密码','密码'], number:['number','number','数字','数字'] },
};

// Prop key short → [jsxKey, jsonKey, xuKey, xuDPrefix]
const P = {
  v: ['variant','v','式',''], b: ['bind','bind','值','值'], s: ['src','src','源',''],
  z: ['size','size','大',''], h: ['shape','shape','形',''],   t: ['onTap','t','触',''],
  r: ['required','req','必',''], d: ['disabled','d','禁',''], p: ['placeholder','ph','空','空'],
  o: ['options','opts','选项','选项'], l: ['label','l','',''], y: ['type','type','类',''],
  n: ['title','title','题',''], k: ['onBack','back','返',''], u: ['duration','dur','时',''],
};

function evalMap(enumMap, key, fmt) {
  return enumMap[key] ? enumMap[key][fmt] : key;
}

// ─── JSX Render ─────────────────────────────────────────────────────
function jsx(node, inl=0) {
  const sp = '  '.repeat(inl);
  if (typeof node === 'string') return sp + JSON.stringify(node);
  const [tag, props, ...kids] = node;
  const def = T[tag];
  const tagName = def ? def[0] : tag;
  const pstr = [];
  if (props) {
    for (const [k,v] of Object.entries(props)) {
      if (v === false) continue;
      const pk = P[k] ? P[k][0] : k;
      if (v === true) { pstr.push(pk); continue; }
      // enum mapping
      let val;
      if (k === 'v') {
        if (tag === 'T') val = evalMap(E.tv, v, 0);
        else if (tag === 'D' || tag === 'O') val = evalMap(E.iv, v, 0);
        else if (tag === 'B') val = evalMap(E.bv, v, 0);
        else val = v;
      } else if (k === 'z') val = evalMap(E.sz, v, 0);
      else if (k === 'h') val = evalMap(E.sh, v, 0);
      else if (k === 'y') val = evalMap(E.it, v, 0);
      else val = v;
      pstr.push(`${pk}=${JSON.stringify(val)}`);
    }
  }
  const ps = pstr.length ? ' ' + pstr.join(' ') : '';
  if (!kids || kids.length === 0) return `${sp}<${tagName}${ps} />`;
  const kl = kids.map(c => jsx(c, inl+1));
  if (kids.length === 1 && typeof kids[0] === 'string')
    return `${sp}<${tagName}${ps}>${kids[0]}</${tagName}>`;
  return `${sp}<${tagName}${ps}>\n${kl.join('\n')}\n${sp}</${tagName}>`;
}

// ─── JSON-EN Render ─────────────────────────────────────────────────
function jsonN(node, inl=0) {
  const sp = '  '.repeat(inl);
  if (typeof node === 'string') return sp+JSON.stringify(node);
  const [tag, props, ...kids] = node;
  const def = T[tag];
  const tagName = def ? def[1] : tag;
  const mp = {};
  if (props) {
    for (const [k,v] of Object.entries(props)) {
      if (v === false) continue;
      const pk = P[k] ? P[k][1] : k;
      let val;
      if (k === 'v') {
        if (tag === 'T') val = evalMap(E.tv, v, 1);
        else if (tag === 'D' || tag === 'O') val = evalMap(E.iv, v, 1);
        else if (tag === 'B') val = evalMap(E.bv, v, 1);
        else val = v;
      } else if (k === 'z') val = evalMap(E.sz, v, 1);
      else if (k === 'h') val = evalMap(E.sh, v, 1);
      else if (k === 'y') val = evalMap(E.it, v, 1);
      else val = v;
      mp[pk] = val;
    }
  }
  const pp = Object.keys(mp).length ? ','+JSON.stringify(mp) : '';
  if (!kids || kids.length === 0) return `${sp}["${tagName}"${pp}]`;
  if (kids.length === 1 && typeof kids[0] === 'string')
    return `${sp}["${tagName}"${pp},${JSON.stringify(kids[0])}]`;
  const csp = '  '.repeat(inl+1);
  const klines = kids.map(c => jsonN(c, inl+1));
  return `${sp}["${tagName}"${pp},\n${klines.join(',\n')}\n${sp}]`;
}

// ─── XU-C Render ────────────────────────────────────────────────────
function xuC(node, inl=0) {
  const sp = '  '.repeat(inl);
  if (typeof node === 'string') return sp+JSON.stringify(node);
  const [tag, props, ...kids] = node;
  const def = T[tag];
  const tagName = def ? def[2] : tag;
  const mp = {};
  if (props) {
    for (const [k,v] of Object.entries(props)) {
      if (v === false) continue;
      const pk = P[k] ? P[k][2] : k;
      let val;
      if (k === 'v') {
        if (tag === 'T') val = evalMap(E.tv, v, 2);
        else if (tag === 'D') val = evalMap(E.iv, v, 2);
        else if (tag === 'O') val = (E.iv[v]||[,,,v])[2]||v;
        else if (tag === 'B') val = evalMap(E.bv, v, 2);
        else if (tag === 'K') val = evalMap(E.lv, v, 2);
        else val = v;
      } else if (k === 'z') val = evalMap(E.sz, v, 2);
      else if (k === 'h') val = evalMap(E.sh, v, 2);
      else if (k === 'y') val = evalMap(E.it, v, 2);
      else val = v;
      mp[pk] = val;
    }
  }
  const pp = Object.keys(mp).length ? ','+JSON.stringify(mp) : '';
  if (!kids || kids.length === 0) return `${sp}["${tagName}"${pp}]`;
  const klines = kids.map(c => xuC(c, inl+1));
  return `${sp}["${tagName}"${pp},\n${klines.join(',\n')}\n${sp}]`;
}

// ─── XU-D Render ────────────────────────────────────────────────────
const propOrder = {
  C:[],L:[],R:[],F:['t'],T:['v','b'],I:['z','s','h'],B:['v','t'],
  N:['y','r','p','b','d'],S:['b','o','r','d'],X:['b','d'],G:['b','d'],
  K:['t','v'],V:['n','k'],D:['v','b'],O:['v','b','u'],A:['z','h','s'],
};

function xuD(node, inl=0) {
  if (typeof node === 'string') return '　'.repeat(inl)+node;
  const [tag, props, ...kids] = node;
  const def = T[tag];
  const tagName = def ? def[3] : tag;
  const toks = [tagName];
  const pp = props || {};
  const order = propOrder[tag] || Object.keys(pp);
  for (const k of order) {
    let v = pp[k];
    if (v === undefined || v === false) continue;
    const prefix = P[k] ? P[k][3]||'' : '';
    let val;
    if (k === 'v') {
      if (tag === 'T') val = evalMap(E.tv, v, 3);
      else if (tag === 'D') val = evalMap(E.iv, v, 3);
      else if (tag === 'O') val = (E.iv[v]||[,,,v])[3]||v;
      else if (tag === 'B') val = evalMap(E.bv, v, 3);
      else if (tag === 'K') val = evalMap(E.lv, v, 3);
      else val = v;
    } else if (k === 'z') val = evalMap(E.sz, v, 3);
    else if (k === 'h') val = evalMap(E.sh, v, 3);
    else if (k === 'y') val = evalMap(E.it, v, 3);
    else val = v;
    if (prefix === '值' || prefix === '选项' || prefix === '触' || prefix === '空')
      toks.push(prefix+val);
    else if (k === 'r' && v === true) toks.push('必');
    else if (k === 'd' && v === true) toks.push('禁');
    else toks.push(String(val));
  }
  const tkids = (kids||[]).filter(c => typeof c === 'string');
  tkids.forEach(c => toks.push(c));
  const line = '　'.repeat(inl) + toks.join(' ');
  const ckids = (kids||[]).filter(c => typeof c !== 'string');
  if (ckids.length === 0) return line;
  return line + '\n' + ckids.map(c => xuD(c, inl+1)).join('\n');
}

// ─── Task Specification ─────────────────────────────────────────────
// Shorthand: Each task = [id, name, prompt, nodes, checks[]]
// nodes = [tag, props|{}, ...children]
// tag = single char from T above, props use short keys from P

function prompter(t, chk) {
  return `设计一个${t}，包含：\n${chk}`;
}

function mkDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); }

function writeTask(id, name, prompt, nodes, checks) {
  const dir = path.join(__dirname, '..', 'tasks', `${id}-${name}`);
  mkDir(dir);
  fs.writeFileSync(path.join(dir, 'prompt.md'), prompt);
  fs.writeFileSync(path.join(dir, 'ref.jsx'), jsx(nodes) + '\n');
  fs.writeFileSync(path.join(dir, 'ref.json-en'), jsonN(nodes) + '\n');
  fs.writeFileSync(path.join(dir, 'ref.xu-c'), xuC(nodes) + '\n');
  fs.writeFileSync(path.join(dir, 'ref.xu-d'), xuD(nodes) + '\n');
  fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify(checks, null, 2) + '\n');
  console.log(`Created ${id}-${name}`);
}

// ─── Task Definitions ───────────────────────────────────────────────
// Each: [id suffix (num), name, prompt text, nodes, checks]
// Node format: [tagChar, {propShortKey:val}, ...children]
// Children strings = text content, nested arrays = sub-components

const TASKS = [
  // 016 - Profile Edit
  [16, 'profile-edit',
   '设计一个个人资料编辑表单：\n- 标题"编辑资料"（Text）\n- 用户头像（Avatar，中等尺寸）\n- 昵称输入框（Input，placeholder="请输入昵称"，bind=nickname）\n- 简介输入框（Input，placeholder="介绍一下自己..."，bind=bio）\n- 性别选择器（Select，bind=gender，options=genders）\n- "保存"主按钮（Button，variant=primary，onTap=saveProfile）\n- "取消"按钮（Button，onTap=cancelEdit）\n- 整体包裹在 Form 中。',
   ['F',{},
     ['T',{},'编辑资料'],
     ['A',{z:'medium'}],
     ['N',{p:'请输入昵称',b:'nickname'}],
     ['N',{p:'介绍一下自己...',b:'bio'}],
     ['S',{b:'gender',o:'genders'}],
     ['B',{v:'primary',t:'saveProfile'},'保存'],
     ['B',{t:'cancelEdit'},'取消'],
   ],
   ['存在标题"编辑资料"','存在用户头像（Avatar）','存在昵称输入框 bind=nickname','存在简介输入框 bind=bio',
    '存在性别选择器 bind=gender','存在"保存"按钮（primary）触发 saveProfile','存在"取消"按钮触发 cancelEdit','整体在 Form 中'],
  ],

  // 017 - Article Card
  [17, 'article-card',
   '设计一个文章卡片：\n- Card 容器\n- 封面图片（Image，大尺寸）\n- 标题"探索未来科技"（Text，heading 样式）\n- 摘要文字（Text）\n- 分类 Badge（variant=info，"科技"）\n- "阅读更多"链接（Link，onTap=readMore）',
   ['C',{},
     ['I',{z:'large',s:'article-cover'}],
     ['T',{v:'heading'},'探索未来科技'],
     ['T',{},'人工智能正在改变我们的生活...'],
     ['D',{v:'info'},'科技'],
     ['K',{t:'readMore'},'阅读更多'],
   ],
   ['存在 Card 容器','存在封面图片（大尺寸）','存在标题（heading 样式）','存在摘要文字','存在 Badge（info）"科技"','存在"阅读更多"链接触发 readMore'],
  ],

  // 018 - Pricing Table  
  [18, 'pricing-table',
   '设计一个定价对比区域：\n- 标题"选择方案"（Text，heading）\n- 三个方案卡片（Row > Card）横向排列\n- 免费版：heading "免费版"、price "¥0"、Text 特点、ghost 按钮（selectFree）\n- 专业版：heading "专业版"、price "¥99"、Text 特点、primary 按钮（selectPro）\n- 企业版：heading "企业版"、price "¥499"、Text 特点、secondary 按钮（selectEnterprise）',
   ['L',{},
     ['T',{v:'heading'},'选择方案'],
     ['R',{},
       ['C',{},['T',{v:'heading'},'免费版'],['T',{v:'price'},'¥0'],['T',{},'基础功能'],['B',{v:'ghost',t:'selectFree'},'免费使用']],
       ['C',{},['T',{v:'heading'},'专业版'],['T',{v:'price'},'¥99'],['T',{},'全部功能'],['T',{},'10个用户'],['B',{v:'primary',t:'selectPro'},'立即订阅']],
       ['C',{},['T',{v:'heading'},'企业版'],['T',{v:'price'},'¥499'],['T',{},'不限用户'],['B',{v:'secondary',t:'selectEnterprise'},'联系我们']],
     ],
   ],
   ['存在标题"选择方案"','存在三个方案卡片横向排列','免费版 heading+price+ghost 按钮 selectFree',
    '专业版 primary 按钮 selectPro','企业版 secondary 按钮 selectEnterprise'],
  ],

  // 019 - Comment Section
  [19, 'comment-section',
   '设计一个评论区：\n- 标题"最新评论"（Text）\n- 三个评论（Row），每个含头像（Avatar，中，圆形）+ 右侧 Column：用户名（heading）、评论文本、时间（caption）\n- 底部"加载更多"链接（Link，onTap=loadMore）',
   ['L',{},
     ['T',{},'最新评论'],
     ['R',{},['A',{z:'medium',h:'circle',s:'u1'}],['L',{},['T',{v:'heading'},'小明'],['T',{},'好文章！'],['T',{v:'caption'},'2小时前']]],
     ['R',{},['A',{z:'medium',h:'circle',s:'u2'}],['L',{},['T',{v:'heading'},'小红'],['T',{},'学习了！'],['T',{v:'caption'},'5小时前']]],
     ['R',{},['A',{z:'medium',h:'circle',s:'u3'}],['L',{},['T',{v:'heading'},'小华'],['T',{},'收藏了'],['T',{v:'caption'},'1天前']]],
     ['K',{t:'loadMore'},'加载更多'],
   ],
   ['存在标题"最新评论"','存在三个评论（Row+Avatar）','每个有 heading 用户名+评论文本+caption 时间',
    '底部"加载更多"链接触发 loadMore'],
  ],

  // 020 - Shopping Cart Item
  [20, 'shopping-cart-item',
   '设计一个购物车商品条目（Card）：\n- Row：商品图片（Image，中）+ Column：商品名（heading）、单价（price）、数量输入框（Input，type=number，bind=quantity）、"删除"按钮（secondary，onTap=removeItem）',
   ['C',{},
     ['R',{},
       ['I',{z:'medium',s:'product'}],
       ['L',{},
         ['T',{v:'heading'},'商品名称'],
         ['T',{v:'price'},'¥99.00'],
         ['N',{y:'number',b:'quantity',p:'1'}],
         ['B',{v:'secondary',t:'removeItem'},'删除'],
       ],
     ],
   ],
   ['存在 Card 容器','存在 Row 水平布局','存在商品图片（medium）','存在商品名（heading）','存在价格（price）',
    '存在数量输入框（type=number）','存在"删除"按钮触发 removeItem'],
  ],

  // 021 - Address Form
  [21,'address-form',
   '设计一个收货地址表单：\n- 标题"添加新地址"（Text）\n  - 收件人输入框（Input，placeholder="收件人"，bind=recipient）\n  - 手机号输入框（Input，type=number，placeholder="手机号"，bind=phone）\n  - 省份选择器（Select，bind=province，options=provinces）\n  - 详细地址输入框（Input，placeholder="详细地址"，bind=address）\n  - "保存地址"按钮（primary，onTap=saveAddress）\n- 整体在 Form 中',
   ['F',{},
     ['T',{},'添加新地址'],
     ['N',{p:'收件人姓名',b:'recipient'}],
     ['N',{y:'number',p:'手机号',b:'phone'}],
     ['S',{b:'province',o:'provinces'}],
     ['N',{p:'详细地址',b:'address'}],
     ['B',{v:'primary',t:'saveAddress'},'保存地址'],
   ],
   ['存在标题"添加新地址"','存在收件人输入框 bind=recipient','存在手机号输入框（type=number）bind=phone',
    '存在省份选择器 bind=province','存在地址输入框 bind=address','存在"保存地址"按钮 primary 触发 saveAddress','整体在 Form 中'],
  ],

  // 022 - FAQ Card
  [22,'faq-card',
   '设计一个 FAQ 卡片：\n- Card 容器\n- 问题"如何重置密码？"（Text，heading）\n- 回答文字（Text，body）\n- Row："有帮助"按钮（primary，onTap=helpfulYes）+ "没有帮助"按钮（ghost，onTap=helpfulNo）\n- 底部统计"共 128 人认为有帮助"（Text，caption）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'如何重置密码？'],
       ['T',{v:'body'},'在设置页面找到修改密码选项，或通过忘记密码链接重置。'],
       ['R',{},['B',{v:'primary',t:'helpfulYes'},'有帮助'],['B',{v:'ghost',t:'helpfulNo'},'没有帮助']],
       ['T',{v:'caption'},'共 128 人认为有帮助'],
     ],
   ],
   ['存在 Card 容器','存在问题标题（heading）','存在回答（body）','存在"有帮助"按钮 primary 触发 helpfulYes',
    '存在"没有帮助"按钮 ghost 触发 helpfulNo','存在统计文字（caption）'],
  ],

  // 023 - Image Gallery
  [23,'image-gallery',
   '设计一个图片画廊行：\n- 标题"相册"（Text）\n- Row 内三个 Column，每个含 Image（中，方形）+ Text caption 说明\n- 整体 Column',
   ['L',{},
     ['T',{},'相册'],
     ['R',{},
       ['L',{},['I',{z:'medium',h:'square',s:'p1'}],['T',{v:'caption'},'风景1']],
       ['L',{},['I',{z:'medium',h:'square',s:'p2'}],['T',{v:'caption'},'风景2']],
       ['L',{},['I',{z:'medium',h:'square',s:'p3'}],['T',{v:'caption'},'风景3']],
     ],
   ],
   ['存在标题"相册"','存在三个图片横向排列','每张 medium 方形','每张有 caption 文字说明'],
  ],

  // 024 - Team Members  
  [24,'team-members',
   '设计一个团队成员展示区：\n- 标题"我们的团队"（heading）\n- Row 三个 Card，每个含：Avatar（大，圆形）、姓名（heading）、职位（body）、"联系"链接（onTap=contactMember）',
   ['L',{},
     ['T',{v:'heading'},'我们的团队'],
     ['R',{},
       ['C',{},['A',{z:'large',h:'circle',s:'m1'}],['T',{v:'heading'},'张三'],['T',{v:'body'},'CEO'],['K',{t:'contactMember'},'联系']],
       ['C',{},['A',{z:'large',h:'circle',s:'m2'}],['T',{v:'heading'},'李四'],['T',{v:'body'},'CTO'],['K',{t:'contactMember'},'联系']],
       ['C',{},['A',{z:'large',h:'circle',s:'m3'}],['T',{v:'heading'},'王五'],['T',{v:'body'},'PM'],['K',{t:'contactMember'},'联系']],
     ],
   ],
   ['存在标题"我们的团队"','存在三个成员横向排列','每个有 Avatar（大，圆形）+heading 姓名+body 职位+联系链接'],
  ],

  // 025 - Order Status
  [25,'order-status',
   '设计一个订单状态页面：\n- 标题"订单状态"（heading）\n- 四个状态 Row：Badge+Text\n  - 已下单 Badge success "✓"\n  - 已确认 Badge success "✓"\n  - 配送中 Badge warning "●"\n  - 已完成 Badge info "○"\n- "查看详情"按钮（primary，onTap=viewDetail）',
   ['L',{},
     ['T',{v:'heading'},'订单状态'],
     ['R',{},['D',{v:'success'},'✓'],['T',{},'已下单']],
     ['R',{},['D',{v:'success'},'✓'],['T',{},'已确认']],
     ['R',{},['D',{v:'warning'},'●'],['T',{},'配送中']],
     ['R',{},['D',{v:'info'},'○'],['T',{},'已完成']],
     ['B',{v:'primary',t:'viewDetail'},'查看详情'],
   ],
   ['存在标题"订单状态"','步骤1: Badge success "✓" + "已下单"','步骤2: Badge success "✓" + "已确认"',
    '步骤3: Badge warning "●" + "配送中"','步骤4: Badge info "○" + "已完成"',
    '存在"查看详情"按钮 primary 触发 viewDetail'],
  ],

  // 026 - Review Card
  [26,'review-card',
   '设计一个评价卡片（Card）：\n- Row：头像（Avatar，中，圆形）+ Column：用户名（heading）、评价内容、评分 Badge（success "5.0"）、时间（caption）',
   ['C',{},
     ['R',{},
       ['A',{z:'medium',h:'circle',s:'reviewer'}],
       ['L',{},
         ['T',{v:'heading'},'匿名用户'],
         ['T',{},'产品质量很好，非常满意！'],
         ['D',{v:'success'},'5.0'],
         ['T',{v:'caption'},'2026-01-15'],
       ],
     ],
   ],
   ['存在 Card 容器','存在 Row 布局','存在头像（中，圆形）','存在用户名（heading）','存在评价内容',
    '存在 Badge success "5.0"','存在时间（caption）'],
  ],

  // 027 - Booking Form
  [27,'booking-form',
   '设计一个预约表单：\n- 标题"预约服务"（heading）\n- 服务类型 Select（bind=serviceType，options=services）\n- 日期输入框（placeholder="选择日期"，bind=bookingDate）\n- 时间输入框（placeholder="选择时间"，bind=bookingTime）\n- 备注输入框（placeholder="备注"，bind=notes）\n- "提交预约"按钮（primary，onTap=submitBooking）+ "取消"按钮\n- 整体在 Form 中',
   ['F',{},
     ['T',{v:'heading'},'预约服务'],
     ['S',{b:'serviceType',o:'services'}],
     ['N',{p:'选择日期',b:'bookingDate'}],
     ['N',{p:'选择时间',b:'bookingTime'}],
     ['N',{p:'备注',b:'notes'}],
     ['B',{v:'primary',t:'submitBooking'},'提交预约'],
     ['B',{t:'cancelBooking'},'取消'],
   ],
   ['存在标题"预约服务"','存在服务类型 Select bind=serviceType','存在日期输入框 bind=bookingDate',
    '存在时间输入框 bind=bookingTime','存在备注输入框 bind=notes',
    '存在"提交预约"按钮 primary 触发 submitBooking','存在"取消"按钮','整体在 Form 中'],
  ],

  // 028 - Notification List
  [28,'notification-list',
   '设计一个通知列表：\n- 标题"消息通知"（heading）\n- 三个通知 Row：Badge + Text + 时间（caption）+ "详情"链接（onTap=viewNotif）\n- 通知1: Badge info "系统"、"订单已发货"\n- 通知2: Badge success "活动"、"优惠券可用"\n- 通知3: Badge warning "提醒"、"会员即将过期"\n- 底部"全部已读"链接（onTap=markAllRead）',
   ['L',{},
     ['T',{v:'heading'},'消息通知'],
     ['R',{},['D',{v:'info'},'系统'],['T',{},'订单已发货'],['T',{v:'caption'},'10分钟前'],['K',{t:'viewNotif'},'详情']],
     ['R',{},['D',{v:'success'},'活动'],['T',{},'优惠券可用'],['T',{v:'caption'},'1小时前'],['K',{t:'viewNotif'},'详情']],
     ['R',{},['D',{v:'warning'},'提醒'],['T',{},'会员即将过期'],['T',{v:'caption'},'昨天'],['K',{t:'viewNotif'},'详情']],
     ['K',{t:'markAllRead'},'全部已读'],
   ],
   ['存在标题"消息通知"','存在三个通知 Row','每个有 Badge+文字+时间+详情链接',
    '通知1 info "系统"','通知2 success "活动"','通知3 warning "提醒"',
    '底部"全部已读"链接触发 markAllRead'],
  ],

  // 029 - Toolbar
  [29,'toolbar',
   '设计一个操作工具栏（Row）：\n- 搜索输入框（placeholder="搜索..."，bind=searchQuery）\n- 分类筛选器 Select（bind=filter，options=filterOptions）\n- "添加"按钮（primary，onTap=addNew）\n- "导出"按钮（secondary，onTap=exportData）',
   ['R',{},
     ['N',{p:'搜索...',b:'searchQuery'}],
     ['S',{b:'filter',o:'filterOptions'}],
     ['B',{v:'primary',t:'addNew'},'添加'],
     ['B',{v:'secondary',t:'exportData'},'导出'],
   ],
   ['存在搜索输入框 bind=searchQuery','存在筛选器 Select bind=filter',
    '存在"添加"按钮 primary 触发 addNew','存在"导出"按钮 secondary 触发 exportData','所有元素在 Row 中'],
  ],

  // 030 - Subscription Card
  [30,'subscription-card',
   '设计一个订阅卡片：\n- Card 容器\n- "年度会员"（heading）\n- "¥199/年"（price）\n- 三个权益列表（Text）\n- "立即订阅"按钮（primary，onTap=subscribeNow）\n- "了解详情"链接（onTap=learnMore）\n- 内部 Column',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'年度会员'],
       ['T',{v:'price'},'¥199/年'],
       ['T',{},'无限次使用'],
       ['T',{},'优先客服支持'],
       ['T',{},'独家内容访问'],
       ['B',{v:'primary',t:'subscribeNow'},'立即订阅'],
       ['K',{t:'learnMore'},'了解详情'],
     ],
   ],
   ['存在 Card','存在"年度会员"（heading）','存在"¥199/年"（price）','存在三个权益文本',
    '存在"立即订阅"按钮 primary 触发 subscribeNow','存在"了解详情"链接触发 learnMore'],
  ],

  // 031 - Payment Method
  [31,'payment-method',
   '设计一个支付方式选择卡片：\n- Card + 标题"选择支付方式"（heading）\n- 三个 Row 各含 Checkbox+Text：微信支付（bind=payWechat）、支付宝（bind=payAlipay）、银行卡（bind=payCard）\n- "确认支付"按钮（primary，onTap=confirmPayment）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'选择支付方式'],
       ['R',{},['X',{b:'payWechat'},'微信支付']],
       ['R',{},['X',{b:'payAlipay'},'支付宝']],
       ['R',{},['X',{b:'payCard'},'银行卡']],
       ['B',{v:'primary',t:'confirmPayment'},'确认支付'],
     ],
   ],
   ['存在 Card','存在标题"选择支付方式"','存在微信支付 Checkbox bind=payWechat',
    '存在支付宝 Checkbox bind=payAlipay','存在银行卡 Checkbox bind=payCard',
    '存在"确认支付"按钮 primary 触发 confirmPayment'],
  ],

  // 032 - Social Post
  [32,'social-post',
   '设计一个社交动态卡片：\n- Card + Column\n- 顶部 Row：头像（中，圆形）+ Column：用户名（heading）+ 时间（caption）\n- 正文内容（Text）\n- 底部 Row："点赞"按钮（ghost，onTap=like）、"评论"按钮（ghost，onTap=comment）、"分享"链接（onTap=share）',
   ['C',{},
     ['L',{},
       ['R',{},['A',{z:'medium',h:'circle',s:'user'}],['L',{},['T',{v:'heading'},'张三'],['T',{v:'caption'},'2小时前']]],
       ['T',{},'今天去了新开的餐厅，环境很棒！'],
       ['R',{},['B',{v:'ghost',t:'like'},'点赞'],['B',{v:'ghost',t:'comment'},'评论'],['K',{t:'share'},'分享']],
     ],
   ],
   ['存在 Card','顶部有头像+用户名（heading）+时间（caption）','存在正文',
    '存在"点赞"按钮 ghost 触发 like','存在"评论"按钮 ghost 触发 comment','存在"分享"链接触发 share'],
  ],

  // 033 - File Upload
  [33,'file-upload',
   '设计一个文件上传区域：\n- Card + 标题"上传文件"（heading）\n- "选择文件"按钮（primary，onTap=selectFile）\n- 已上传文件 Row：文件名"报告.pdf"+ 大小"2.5 MB"（caption）+ Badge success "已上传" + "删除"链接\n- "提交"按钮（primary，onTap=submitFiles）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'上传文件'],
       ['B',{v:'primary',t:'selectFile'},'选择文件'],
       ['R',{},['T',{},'报告.pdf'],['T',{v:'caption'},'2.5 MB'],['D',{v:'success'},'已上传'],['K',{t:'removeFile'},'删除']],
       ['B',{v:'primary',t:'submitFiles'},'提交'],
     ],
   ],
   ['存在 Card','存在标题"上传文件"','存在"选择文件"按钮 primary 触发 selectFile',
    '存在文件行：文件名+大小+Badge+删除链接','存在"提交"按钮 primary 触发 submitFiles'],
  ],

  // 034 - Event Card
  [34,'event-card',
   '设计一个活动卡片：\n- Card + 标题"2026技术创新大会"（heading）\n- 日期 Row："日期" + "2026-03-15"\n- 地点 Row："地点" + "北京国际会议中心"\n- Badge info "科技"\n- 票价"¥299"（price）\n- "立即报名"按钮（primary，onTap=registerEvent）\n- 内部 Column',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'2026技术创新大会'],
       ['R',{},['T',{},'日期'],['T',{},'2026-03-15']],
       ['R',{},['T',{},'地点'],['T',{},'北京国际会议中心']],
       ['D',{v:'info'},'科技'],
       ['T',{v:'price'},'¥299'],
       ['B',{v:'primary',t:'registerEvent'},'立即报名'],
     ],
   ],
   ['存在 Card','存在标题（heading）','存在日期行','存在地点行','存在 Badge info "科技"',
    '存在票价（price）','存在"立即报名"按钮 primary 触发 registerEvent'],
  ],

  // 035 - Weather Widget
  [35,'weather-widget',
   '设计一个天气小部件（Card）：\n- Row：天气图标（Image，中，方形）+ Column：温度"26°C"（heading）、城市"北京"、湿度"湿度：45%"（caption）、风速"风速：3级"（caption）',
   ['C',{},
     ['R',{},
       ['I',{z:'medium',h:'square',s:'weather-icon'}],
       ['L',{},
         ['T',{v:'heading'},'26°C'],
         ['T',{},'北京'],
         ['T',{v:'caption'},'湿度：45%'],
         ['T',{v:'caption'},'风速：3级'],
       ],
     ],
   ],
   ['存在 Card','存在 Row 布局','存在天气图标（medium，方形）','存在温度"26°C"（heading）',
    '存在城市"北京"','存在湿度文字（caption）','存在风速文字（caption）'],
  ],

  // 036 - Movie Card
  [36,'movie-card',
   '设计一个电影卡片：\n- Card + 电影海报 Image（大）\n- 标题"星际穿越"（heading）\n- Row：Badge success "9.3" + "2014" + Badge info "科幻"\n- "购票"按钮（primary，onTap=buyTicket）',
   ['C',{},
     ['L',{},
       ['I',{z:'large',s:'movie-poster'}],
       ['T',{v:'heading'},'星际穿越'],
       ['R',{},['D',{v:'success'},'9.3'],['T',{},'2014'],['D',{v:'info'},'科幻']],
       ['B',{v:'primary',t:'buyTicket'},'购票'],
     ],
   ],
   ['存在 Card','存在海报 Image（大）','存在标题（heading）','存在 Badge success "9.3"',
    '存在"2014"','存在 Badge info "科幻"','存在"购票"按钮 primary 触发 buyTicket'],
  ],

  // 037 - Recipe Card
  [37,'recipe-card',
   '设计一个食谱卡片：\n- Card + 食谱图片（大）\n- "番茄炒蛋"（heading）\n- Row：Badge info "简单" + "15分钟"\n- 食材列表文字\n- "查看完整做法"链接（onTap=viewRecipe）',
   ['C',{},
     ['L',{},
       ['I',{z:'large',s:'recipe'}],
       ['T',{v:'heading'},'番茄炒蛋'],
       ['R',{},['D',{v:'info'},'简单'],['T',{},'15分钟']],
       ['T',{},'食材：番茄、鸡蛋、葱、盐、糖'],
       ['K',{t:'viewRecipe'},'查看完整做法'],
     ],
   ],
   ['存在 Card','存在食谱图片（大）','存在食谱名（heading）','存在 Badge info "简单"',
    '存在时间"15分钟"','存在食材列表','存在"查看完整做法"链接触发 viewRecipe'],
  ],

  // 038 - Testimonial
  [38,'testimonial',
   '设计一个评价引用卡片：\n- Card + Column\n- Avatar（中，圆形）\n- 引用文字（body）\n- 用户名（heading）+ 角色（caption）\n- Badge success "★★★★★"',
   ['C',{},
     ['L',{},
       ['A',{z:'medium',h:'circle',s:'user'}],
       ['T',{v:'body'},'"使用后效率提高50%，强烈推荐！"'],
       ['T',{v:'heading'},'张先生'],
       ['T',{v:'caption'},'高级用户'],
       ['D',{v:'success'},'★★★★★'],
     ],
   ],
   ['存在 Card','存在 Avatar（中，圆形）','存在引用文字（body）','存在用户名（heading）',
    '存在角色（caption）','存在 Badge success "★★★★★"'],
  ],

  // 039 - Invite Form
  [39,'invite-form',
   '设计一个邀请成员表单：\n- 标题"邀请成员"（heading）\n- 邮箱输入框（type=email，必填，placeholder="请输入对方邮箱"，bind=inviteEmail）\n- 角色 Select（bind=inviteRole，options=roles）\n- 附言输入框（bind=inviteMessage）\n- "发送邀请"按钮（primary，onTap=sendInvite）+ "取消"按钮\n- 整体在 Form 中',
   ['F',{},
     ['T',{v:'heading'},'邀请成员'],
     ['N',{y:'email',r:true,p:'请输入对方邮箱',b:'inviteEmail'}],
     ['S',{b:'inviteRole',o:'roles'}],
     ['N',{p:'添加附言...',b:'inviteMessage'}],
     ['B',{v:'primary',t:'sendInvite'},'发送邀请'],
     ['B',{t:'cancelInvite'},'取消'],
   ],
   ['存在标题"邀请成员"','存在邮箱输入框（type=email，必填）','存在角色 Select',
    '存在附言输入框','存在"发送邀请"按钮 primary 触发 sendInvite','存在"取消"按钮','整体在 Form 中'],
  ],

  // 040 - Coupon Card
  [40,'coupon-card',
   '设计一个优惠券卡片：\n- Card\n- Badge success "满减券"\n- "满100减20"（price）\n- 有效期（caption）\n- "CODE2026"（Text）\n- Row："复制优惠码"按钮（secondary，onTap=copyCoupon）+ "立即使用"按钮（primary，onTap=useCoupon）',
   ['C',{},
     ['L',{},
       ['D',{v:'success'},'满减券'],
       ['T',{v:'price'},'满100减20'],
       ['T',{v:'caption'},'有效期至2026-12-31'],
       ['T',{},'CODE2026'],
       ['R',{},['B',{v:'secondary',t:'copyCoupon'},'复制优惠码'],['B',{v:'primary',t:'useCoupon'},'立即使用']],
     ],
   ],
   ['存在 Card','存在 Badge success "满减券"','存在"满100减20"（price）','存在有效期（caption）',
    '存在"CODE2026"','存在"复制优惠码"按钮触发 copyCoupon','存在"立即使用"按钮 primary 触发 useCoupon'],
  ],

  // 041 - Task Item
  [41,'task-item',
   '设计一个待办事项条目（Card + Row）：\n- Checkbox（bind=taskDone）\n- Column：任务名"完成报告"（heading）+ 截止日期（caption）\n- Badge danger "高"\n- "删除"按钮（ghost，onTap=deleteTask）',
   ['C',{},
     ['R',{},
       ['X',{b:'taskDone'}],
       ['L',{},['T',{v:'heading'},'完成报告'],['T',{v:'caption'},'截止：2026-01-20']],
       ['D',{v:'danger'},'高'],
       ['B',{v:'ghost',t:'deleteTask'},'删除'],
     ],
   ],
   ['存在 Card','存在 Row','存在 Checkbox bind=taskDone','存在任务名（heading）','存在截止日期（caption）',
    '存在 Badge danger "高"','存在"删除"按钮 ghost 触发 deleteTask'],
  ],

  // 042 - Timer Card
  [42,'timer-card',
   '设计一个倒计时卡片：\n- Card + 标题"倒计时"（heading）\n- Row 四个 Column：各含 heading 数值 + caption 标签（天/时/分/秒）\n- Row："开始"按钮（primary，onTap=startTimer）+ "重置"按钮（ghost，onTap=resetTimer）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'倒计时'],
       ['R',{},
         ['L',{},['T',{v:'heading'},'02'],['T',{v:'caption'},'天']],
         ['L',{},['T',{v:'heading'},'14'],['T',{v:'caption'},'时']],
         ['L',{},['T',{v:'heading'},'30'],['T',{v:'caption'},'分']],
         ['L',{},['T',{v:'heading'},'45'],['T',{v:'caption'},'秒']],
       ],
       ['R',{},['B',{v:'primary',t:'startTimer'},'开始'],['B',{v:'ghost',t:'resetTimer'},'重置']],
     ],
   ],
   ['存在 Card','存在标题"倒计时"','存在四个时间块（天/时/分/秒）',
    '每个有 heading 数值+caption 标签','存在"开始"按钮 primary 触发 startTimer','存在"重置"按钮 ghost 触发 resetTimer'],
  ],

  // 043 - Poll Card  
  [43,'poll-card',
   '设计一个投票卡片：\n- Card + 问题"您最喜欢哪个框架？"（heading）\n- 三个 secondary 按钮纵向排列：React（voteReact）、Vue（voteVue）、Angular（voteAngular）\n- "共 256 人参与"（caption）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'您最喜欢哪个前端框架？'],
       ['B',{v:'secondary',t:'voteReact'},'React'],
       ['B',{v:'secondary',t:'voteVue'},'Vue'],
       ['B',{v:'secondary',t:'voteAngular'},'Angular'],
       ['T',{v:'caption'},'共 256 人参与'],
     ],
   ],
   ['存在 Card','存在问题（heading）','存在 React 按钮触发 voteReact','存在 Vue 按钮触发 voteVue',
    '存在 Angular 按钮触发 voteAngular','存在统计文字（caption）'],
  ],

  // 044 - Side Menu
  [44,'side-menu',
   '设计一个侧边菜单（Card + Column）：\n- 三个菜单 Row：Badge + Link\n- 🏠 Badge info + "首页"链接（onTap=goHome）\n- 📊 Badge success + "数据统计"链接（onTap=goStats）\n- ⚙️ Badge warning + "系统设置"链接（onTap=goSettings）',
   ['C',{},
     ['L',{},
       ['R',{},['D',{v:'info'},'🏠'],['K',{t:'goHome'},'首页']],
       ['R',{},['D',{v:'success'},'📊'],['K',{t:'goStats'},'数据统计']],
       ['R',{},['D',{v:'warning'},'⚙️'],['K',{t:'goSettings'},'系统设置']],
     ],
   ],
   ['存在 Card','存在三个菜单 Row','每个含 Badge+Link','首页 info goHome','数据统计 success goStats','系统设置 warning goSettings'],
  ],

  // 045 - Breadcrumb
  [45,'breadcrumb',
   '设计一个面包屑导航（Row）：\n- "首页"链接（onTap=navHome）\n- ">" 分隔文字\n- "分类"链接（onTap=navCategory）\n- ">" 分隔文字\n- "当前页面"文字',
   ['R',{},
     ['K',{t:'navHome'},'首页'],
     ['T',{},'>'],
     ['K',{t:'navCategory'},'分类'],
     ['T',{},'>'],
     ['T',{},'当前页面'],
   ],
   ['存在 Row','存在"首页"链接触发 navHome','存在">"分隔符','存在"分类"链接触发 navCategory','存在"当前页面"文本'],
  ],

  // 046 - Tab Bar
  [46,'tab-bar',
   '设计一个标签页切换栏：\n- Row：三个标签按钮\n  - "全部"按钮（primary，onTap=tabAll）\n  - "待处理"按钮（ghost，onTap=tabPending）\n  - "已完成"按钮（ghost，onTap=tabDone）\n- Card 内容区显示当前标签内容',
   ['L',{},
     ['R',{},
       ['B',{v:'primary',t:'tabAll'},'全部'],
       ['B',{v:'ghost',t:'tabPending'},'待处理'],
       ['B',{v:'ghost',t:'tabDone'},'已完成'],
     ],
     ['C',{},['T',{},'全部项目列表显示在此处']],
   ],
   ['存在标签 Row 三个按钮','全部 primary tabAll','待处理 ghost tabPending','已完成 ghost tabDone','存在 Card 内容区'],
  ],

  // 047 - Search Results
  [47,'search-results',
   '设计一个搜索结果列表：\n- "共找到 12 条结果"（caption）\n- 三个结果 Card，每行 Row：Image（中）+ Column：标题（heading）+ 摘要 + Badge info\n- "加载更多"链接（onTap=loadMore）',
   ['L',{},
     ['T',{v:'caption'},'共找到 12 条结果'],
     ['C',{},['R',{},['I',{z:'medium',s:'r1'}],['L',{},['T',{v:'heading'},'标题1'],['T',{},'摘要1'],['D',{v:'info'},'标签1']]]],
     ['C',{},['R',{},['I',{z:'medium',s:'r2'}],['L',{},['T',{v:'heading'},'标题2'],['T',{},'摘要2'],['D',{v:'info'},'标签2']]]],
     ['C',{},['R',{},['I',{z:'medium',s:'r3'}],['L',{},['T',{v:'heading'},'标题3'],['T',{},'摘要3'],['D',{v:'info'},'标签3']]]],
     ['K',{t:'loadMore'},'加载更多'],
   ],
   ['存在结果计数（caption）','存在三个结果 Card','每个含 Image+Column+heading 标题+摘要+Badge','底部"加载更多"链接触发 loadMore'],
  ],

  // 048 - User Menu
  [48,'user-menu',
   '设计一个用户菜单卡片：\n- Card + Column\n- 顶部 Row：Avatar（中，圆形）+ Column：用户名（heading）+ 角色（caption）\n- 四个 Link 纵向排列："个人资料"（goProfile）、"账户设置"（goAccountSettings）、"消息中心"（goMessages）、"退出登录"（logout，subtle）',
   ['C',{},
     ['L',{},
       ['R',{},['A',{z:'medium',h:'circle',s:'admin'}],['L',{},['T',{v:'heading'},'admin'],['T',{v:'caption'},'管理员']]],
       ['K',{t:'goProfile'},'个人资料'],
       ['K',{t:'goAccountSettings'},'账户设置'],
       ['K',{t:'goMessages'},'消息中心'],
       ['K',{t:'logout',v:'subtle'},'退出登录'],
     ],
   ],
   ['存在 Card','顶部有头像+用户名+角色','存在"个人资料"链接 goProfile','存在"账户设置"链接 goAccountSettings',
    '存在"消息中心"链接 goMessages','存在"退出登录"链接 logout（subtle）'],
  ],

  // 049 - Cookie Consent
  [49,'cookie-consent',
   '设计一个 Cookie 同意横幅：\n- Card + Cookie 图标（Image，中）\n- 标题"Cookie 声明"（heading）\n- 说明文字\n- Row："接受所有"按钮（primary，onTap=acceptAll）+ "仅必要"按钮（secondary）+ "设置"链接（onTap=cookieSettings）',
   ['C',{},
     ['L',{},
       ['I',{z:'medium',s:'cookie-icon'}],
       ['T',{v:'heading'},'Cookie 声明'],
       ['T',{},'我们使用 Cookie 来提升您的体验。'],
       ['R',{},['B',{v:'primary',t:'acceptAll'},'接受所有'],['B',{v:'secondary',t:'acceptNecessary'},'仅必要'],['K',{t:'cookieSettings'},'设置']],
     ],
   ],
   ['存在 Card','存在 Cookie 图标','存在标题"Cookie 声明"','存在说明文字',
    '存在"接受所有"按钮 primary acceptAll','存在"仅必要"按钮','存在"设置"链接 cookieSettings'],
  ],

  // 050 - Empty State
  [50,'empty-state',
   '设计一个空状态页面：\n- Image（大，src=empty-state）\n- 标题"暂无数据"（heading）\n- 说明文字（body）\n- "刷新"按钮（primary，onTap=refreshData）\n- "返回首页"链接（onTap=goHomePage）\n- 整体 Column',
   ['L',{},
     ['I',{z:'large',s:'empty-state'}],
     ['T',{v:'heading'},'暂无数据'],
     ['T',{v:'body'},'当前没有可显示的内容。'],
     ['B',{v:'primary',t:'refreshData'},'刷新'],
     ['K',{t:'goHomePage'},'返回首页'],
   ],
   ['存在空状态图片（大）','存在标题"暂无数据"（heading）','存在说明（body）',
    '存在"刷新"按钮 primary refreshData','存在"返回首页"链接 goHomePage'],
  ],

  // 051 - Error Page
  [51,'error-page',
   '设计一个错误提示页面：\n- Card + "404"（heading）+"页面未找到"+"描述"（body）\n- "重新加载"按钮（primary，onTap=reloadPage）\n- "返回首页"链接（onTap=backToHome）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'404'],
       ['T',{},'页面未找到'],
       ['T',{v:'body'},'您访问的页面不存在。'],
       ['B',{v:'primary',t:'reloadPage'},'重新加载'],
       ['K',{t:'backToHome'},'返回首页'],
     ],
   ],
   ['存在 Card','存在"404"（heading）','存在"页面未找到"','存在 body 描述',
    '存在"重新加载"按钮 primary reloadPage','存在"返回首页"链接 backToHome'],
  ],

  // 052 - Two-Factor Auth
  [52,'two-factor-auth',
   '设计一个双因素认证表单：\n- 标题"二次验证"（heading）\n- 说明文字\n- 验证码输入框（type=number，placeholder="6位验证码"，bind=verificationCode）\n- "验证"按钮（primary，onTap=verifyCode）\n- "重新发送"链接（onTap=resendCode）\n- "60秒后可重新发送"（caption）\n- 整体在 Form 中',
   ['F',{},
     ['T',{v:'heading'},'二次验证'],
     ['T',{},'请输入6位验证码'],
     ['N',{y:'number',p:'6位验证码',b:'verificationCode'}],
     ['B',{v:'primary',t:'verifyCode'},'验证'],
     ['K',{t:'resendCode'},'重新发送'],
     ['T',{v:'caption'},'60秒后可重新发送'],
   ],
   ['存在标题"二次验证"','存在说明','存在验证码输入框（type=number）',
    '存在"验证"按钮 primary verifyCode','存在"重新发送"链接 resendCode','存在倒计时（caption）','整体在 Form 中'],
  ],

  // 053 - Password Reset
  [53,'password-reset',
   '设计一个密码重置表单：\n- 标题"重置密码"（heading）\n- 说明文字\n- 邮箱输入框（type=email，必填，placeholder="注册邮箱"，bind=resetEmail）\n- "发送重置链接"按钮（primary，onTap=sendResetLink）\n- "返回登录"链接（onTap=backToLogin）\n- 整体在 Form 中',
   ['F',{},
     ['T',{v:'heading'},'重置密码'],
     ['T',{},'请输入注册邮箱以接收重置链接。'],
     ['N',{y:'email',r:true,p:'注册邮箱',b:'resetEmail'}],
     ['B',{v:'primary',t:'sendResetLink'},'发送重置链接'],
     ['K',{t:'backToLogin'},'返回登录'],
   ],
   ['存在标题"重置密码"','存在说明','存在邮箱输入框（type=email，必填）',
    '存在"发送重置链接"按钮 primary sendResetLink','存在"返回登录"链接 backToLogin','整体在 Form 中'],
  ],

  // 054 - Language Switcher
  [54,'language-switcher',
   '设计一个语言切换器：\n- 标题"切换语言"（heading）\n- Row：中文按钮（primary，onTap=switchCN）、English（ghost，switchEN）、日本語（ghost，switchJP）\n- Badge success "当前"',
   ['L',{},
     ['T',{v:'heading'},'切换语言'],
     ['R',{},['B',{v:'primary',t:'switchCN'},'中文'],['B',{v:'ghost',t:'switchEN'},'English'],['B',{v:'ghost',t:'switchJP'},'日本語']],
     ['D',{v:'success'},'当前'],
   ],
   ['存在标题"切换语言"','存在三个按钮横向排列','中文 primary switchCN','English ghost switchEN','日本語 ghost switchJP','存在 Badge success "当前"'],
  ],

  // 055 - Notif Settings
  [55,'notification-settings',
   '设计一个通知设置界面：\n- 标题"通知设置"（heading）\n- Card 内三个 Row：评论回复 Toggle（bind=notifComment）、新粉丝 Toggle（bind=notifFollower）、系统公告 Toggle（bind=notifSystem）\n- "保存设置"按钮（primary，onTap=saveNotifSettings）',
   ['L',{},
     ['T',{v:'heading'},'通知设置'],
     ['C',{},['L',{},
       ['R',{},['T',{},'评论回复'],['G',{b:'notifComment'}]],
       ['R',{},['T',{},'新粉丝'],['G',{b:'notifFollower'}]],
       ['R',{},['T',{},'系统公告'],['G',{b:'notifSystem'}]],
     ]],
     ['B',{v:'primary',t:'saveNotifSettings'},'保存设置'],
   ],
   ['存在标题"通知设置"','存在 Card','存在评论回复 Toggle notifComment','存在新粉丝 Toggle notifFollower',
    '存在系统公告 Toggle notifSystem','每项为 Row 布局','存在"保存设置"按钮 primary saveNotifSettings'],
  ],

  // 056 - Account Deletion
  [56,'account-deletion',
   '设计一个账户注销确认页面：\n- Card + Badge danger "⚠" + 标题"注销账户"（heading）+ 警告（body）\n- 确认输入框（placeholder="输入确认删除"，bind=confirmDelete）\n- Row："确认注销"按钮（primary，onTap=confirmDeletion）+ "取消"按钮（ghost，onTap=cancelDeletion）',
   ['C',{},
     ['L',{},
       ['D',{v:'danger'},'⚠'],
       ['T',{v:'heading'},'注销账户'],
       ['T',{v:'body'},'此操作不可撤销。'],
       ['N',{p:"输入'确认删除'以继续",b:'confirmDelete'}],
       ['R',{},['B',{v:'primary',t:'confirmDeletion'},'确认注销'],['B',{v:'ghost',t:'cancelDeletion'},'取消']],
     ],
   ],
   ['存在 Card','存在 Badge danger "⚠"','存在标题（heading）','存在警告（body）',
    '存在确认输入框','存在"确认注销"按钮 primary confirmDeletion','存在"取消"按钮 ghost cancelDeletion'],
  ],

  // 057 - Theme Picker
  [57,'theme-picker',
   '设计一个主题选择器：\n- 标题"选择主题"（heading）\n- Row 三个 Card：浅色/深色/自动，每个含名称+描述（caption）\n- "应用主题"按钮（primary，onTap=applyTheme）',
   ['L',{},
     ['T',{v:'heading'},'选择主题'],
     ['R',{},
       ['C',{},['T',{},'浅色'],['T',{v:'caption'},'浅色主题']],
       ['C',{},['T',{},'深色'],['T',{v:'caption'},'深色主题']],
       ['C',{},['T',{},'自动'],['T',{v:'caption'},'跟随系统']],
     ],
     ['B',{v:'primary',t:'applyTheme'},'应用主题'],
   ],
   ['存在标题"选择主题"','存在三个主题卡片横向排列','浅色/深色/自动含 caption 描述','存在"应用主题"按钮 primary applyTheme'],
  ],

  // 058 - Tag Badges
  [58,'tag-badges',
   '设计一个标签展示区：\n- 标题"热门标签"（heading）\n- Row 六个 Badge：前端开发（info）、React（success）、TypeScript（warning）、Node.js（danger）、CSS（info）、JavaScript（success）\n- "查看更多"链接（onTap=viewMoreTags）',
   ['L',{},
     ['T',{v:'heading'},'热门标签'],
     ['R',{},
       ['D',{v:'info'},'前端开发'],
       ['D',{v:'success'},'React'],
       ['D',{v:'warning'},'TypeScript'],
       ['D',{v:'danger'},'Node.js'],
       ['D',{v:'info'},'CSS'],
       ['D',{v:'success'},'JavaScript'],
     ],
     ['K',{t:'viewMoreTags'},'查看更多'],
   ],
   ['存在标题"热门标签"','存在六个 Badge 横向排列','覆盖 info/success/warning/danger 四种 variant','存在"查看更多"链接 viewMoreTags'],
  ],

  // 059 - Progress Card
  [59,'progress-card',
   '设计一个学习进度卡片：\n- Card + "React 入门教程"（heading）+"已完成 65%" + Badge success "进行中" + "13/20 课时"（caption）+ "继续学习"按钮（primary，onTap=continueLearning）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'React 入门教程'],
       ['T',{},'已完成 65%'],
       ['D',{v:'success'},'进行中'],
       ['T',{v:'caption'},'已学习 13/20 课时'],
       ['B',{v:'primary',t:'continueLearning'},'继续学习'],
     ],
   ],
   ['存在 Card','存在课程名（heading）','存在进度"65%"','存在 Badge success "进行中"',
    '存在统计（caption）','存在"继续学习"按钮 primary continueLearning'],
  ],

  // 060 - Invite Code Card
  [60,'invite-code-card',
   '设计一个邀请码卡片：\n- Card + 标题"邀请好友"（heading）+ 说明 + "ABCD1234"（heading）+ Badge success "有效" + 有效期（caption）\n- Row："复制链接"按钮（secondary，onTap=copyInviteLink）+ "分享"按钮（primary，onTap=shareInvite）',
   ['C',{},
     ['L',{},
       ['T',{v:'heading'},'邀请好友'],
       ['T',{},'邀请好友注册，双方得优惠券！'],
       ['T',{v:'heading'},'ABCD1234'],
       ['D',{v:'success'},'有效'],
       ['T',{v:'caption'},'有效期至 2026-12-31'],
       ['R',{},['B',{v:'secondary',t:'copyInviteLink'},'复制链接'],['B',{v:'primary',t:'shareInvite'},'分享']],
     ],
   ],
   ['存在 Card','存在标题"邀请好友"（heading）','存在说明','存在邀请码（heading）',
    '存在 Badge success "有效"','存在有效期（caption）','存在"复制链接"按钮 copyInviteLink','存在"分享"按钮 primary shareInvite'],
  ],

  // 061 - Chat Bubble
  [61,'chat-bubble',
   '设计一个聊天气泡卡片：\n- Card + Row：Avatar（中，圆形）+ Column：用户名（heading）+ 消息 + 时间（caption）+ Badge danger "2"',
   ['C',{},
     ['R',{},
       ['A',{z:'medium',h:'circle',s:'agent'}],
       ['L',{},['T',{v:'heading'},'客服小美'],['T',{},'您好，有什么可以帮您？'],['T',{v:'caption'},'10:30']],
       ['D',{v:'danger'},'2'],
     ],
   ],
   ['存在 Card','存在 Row','存在 Avatar（中，圆形）','存在用户名（heading）','存在消息','存在时间（caption）','存在 Badge danger "2"'],
  ],

  // 062 - Contact Form
  [62,'contact-form',
   '设计一个联系我们表单：\n- 标题"联系我们"（heading）\n- 姓名输入框（bind=contactName）+ 邮箱（type=email，bind=contactEmail）+ 电话（type=number，bind=contactPhone）+ 留言（bind=contactMessage）\n- "发送"按钮（primary，onTap=sendMessage）\n- 整体在 Form 中',
   ['F',{},
     ['T',{v:'heading'},'联系我们'],
     ['N',{p:'姓名',b:'contactName'}],
     ['N',{y:'email',p:'邮箱',b:'contactEmail'}],
     ['N',{y:'number',p:'电话',b:'contactPhone'}],
     ['N',{p:'留言内容',b:'contactMessage'}],
     ['B',{v:'primary',t:'sendMessage'},'发送'],
   ],
   ['存在标题"联系我们"','存在姓名输入框','存在邮箱输入框（type=email）','存在电话输入框（type=number）',
    '存在留言输入框','存在"发送"按钮 primary sendMessage','整体在 Form 中'],
  ],

  // 063 - Product Grid
  [63,'product-grid',
   '设计一个推荐商品行：\n- 标题"推荐商品"（heading）\n- Row 三个 Card，每个含：Image（中）+ 商品名 + 价格（price）+ "购买"按钮（primary，onTap=buyProduct）',
   ['L',{},
     ['T',{v:'heading'},'推荐商品'],
     ['R',{},
       ['C',{},['I',{z:'medium',s:'p1'}],['T',{},'商品A'],['T',{v:'price'},'¥129'],['B',{v:'primary',t:'buyProduct'},'购买']],
       ['C',{},['I',{z:'medium',s:'p2'}],['T',{},'商品B'],['T',{v:'price'},'¥199'],['B',{v:'primary',t:'buyProduct'},'购买']],
       ['C',{},['I',{z:'medium',s:'p3'}],['T',{},'商品C'],['T',{v:'price'},'¥299'],['B',{v:'primary',t:'buyProduct'},'购买']],
     ],
   ],
   ['存在标题"推荐商品"（heading）','存在三个商品 Card 横向排列','每个有 Image（中）+名称+价格（price）+购买按钮 primary buyProduct'],
  ],

  // 064 - Login Options
  [64,'login-options',
   '设计一个登录选项页面：\n- 标题"欢迎回来"（heading）\n- Row：三个 social 登录按钮（secondary）：微信（wechatLogin）、QQ（qqLogin）、微博（weiboLogin）\n- "或使用账号密码"（Text）\n- 邮箱+密码输入框\n- "登录"按钮（primary，onTap=loginSubmit）\n- "注册账号"链接（onTap=goRegister）',
   ['L',{},
     ['T',{v:'heading'},'欢迎回来'],
     ['R',{},['B',{v:'secondary',t:'wechatLogin'},'微信登录'],['B',{v:'secondary',t:'qqLogin'},'QQ登录'],['B',{v:'secondary',t:'weiboLogin'},'微博登录']],
     ['T',{},'或使用账号密码'],
     ['N',{y:'email',p:'邮箱',b:'loginEmail'}],
     ['N',{y:'password',p:'密码',b:'loginPassword'}],
     ['B',{v:'primary',t:'loginSubmit'},'登录'],
     ['K',{t:'goRegister'},'注册账号'],
   ],
   ['存在标题"欢迎回来"','存在三个 social 按钮 Row','微信/QQ/微博 secondary','存在分隔文字',
    '存在邮箱+密码输入框','存在"登录"按钮 primary loginSubmit','存在"注册账号"链接 goRegister'],
  ],

  // 065 - Account Switcher
  [65,'account-switcher',
   '设计一个账号切换器卡片：\n- Card + Row：Avatar（中，圆形）+ Column：用户名（heading）+ 邮箱（caption）\n- "切换账号"按钮（primary，onTap=switchAccount）\n- "添加账号"链接（onTap=addAccount）',
   ['C',{},
     ['L',{},
       ['R',{},['A',{z:'medium',h:'circle',s:'user'}],['L',{},['T',{v:'heading'},'当前用户'],['T',{v:'caption'},'user@example.com']]],
       ['B',{v:'primary',t:'switchAccount'},'切换账号'],
       ['K',{t:'addAccount'},'添加账号'],
     ],
   ],
   ['存在 Card','存在 Row（头像+用户名+邮箱）','用户名 heading 邮箱 caption','存在"切换账号"按钮 primary switchAccount','存在"添加账号"链接 addAccount'],
  ],

  // 066 - Saved Address
  [66,'saved-address',
   '设计一个已保存地址卡片：\n- Card + Badge success "默认" + 收件人（heading）+ 地址 + 电话 + Row："编辑"链接+ "删除"链接',
   ['C',{},
     ['L',{},
       ['D',{v:'success'},'默认'],
       ['T',{v:'heading'},'张三'],
       ['T',{},'北京市朝阳区建国路88号'],
       ['T',{},'13800138000'],
       ['R',{},['K',{t:'editAddress'},'编辑'],['K',{t:'deleteAddress'},'删除']],
     ],
   ],
   ['存在 Card','存在 Badge success "默认"','存在收件人（heading）','存在地址','存在电话','存在"编辑"链接 editAddress','存在"删除"链接 deleteAddress'],
  ],

  // 067 - Order History
  [67,'order-history',
   '设计一个订单历史列表：\n- 标题"订单记录"（heading）\n- 三个 Card，每个含：订单号+日期（caption）+商品+价格（price）+状态 Badge+"查看详情"链接\n- 状态：success"已完成"、warning"待发货"、info"已发货"',
   ['L',{},
     ['T',{v:'heading'},'订单记录'],
     ['C',{},['L',{},['R',{},['T',{},'#2026001'],['T',{v:'caption'},'2026-01-10']],['T',{},'商品A'],['T',{v:'price'},'¥258'],['D',{v:'success'},'已完成'],['K',{t:'viewOrder'},'查看详情']]],
     ['C',{},['L',{},['R',{},['T',{},'#2026002'],['T',{v:'caption'},'2026-01-12']],['T',{},'商品B'],['T',{v:'price'},'¥199'],['D',{v:'warning'},'待发货'],['K',{t:'viewOrder'},'查看详情']]],
     ['C',{},['L',{},['R',{},['T',{},'#2026003'],['T',{v:'caption'},'2026-01-15']],['T',{},'商品C'],['T',{v:'price'},'¥597'],['D',{v:'info'},'已发货'],['K',{t:'viewOrder'},'查看详情']]],
   ],
   ['存在标题"订单记录"','存在三个 Card','每个有订单号+日期+商品+价格+状态 Badge+查看详情',
    '订单1 success"已完成"','订单2 warning"待发货"','订单3 info"已发货"'],
  ],

  // 068 - Wishlist Item
  [68,'wishlist-item',
   '设计一个心愿单条目：\n- Card + Row：Image（中）+ Column：商品名（heading）+价格（price）+Badge success"有货" + Column："加入购物车"按钮（primary，onTap=addToCart）+ "移除"链接',
   ['C',{},
     ['R',{},
       ['I',{z:'medium',s:'wishlist-item'}],
       ['L',{},['T',{v:'heading'},'时尚背包'],['T',{v:'price'},'¥299'],['D',{v:'success'},'有货']],
       ['L',{},['B',{v:'primary',t:'addToCart'},'加入购物车'],['K',{t:'removeWishlist'},'移除']],
     ],
   ],
   ['存在 Card','存在 Row','存在 Image（中）','存在商品名（heading）+价格（price）+Badge success"有货"',
    '存在"加入购物车"按钮 primary addToCart','存在"移除"链接'],
  ],

  // 069 - Category Tags
  [69,'category-tags',
   '设计一个分类标签栏（Row）：\n- 六个 Badge info：全部、科技、生活、教育、娱乐、体育',
   ['R',{},
     ['D',{v:'info'},'全部'],
     ['D',{v:'info'},'科技'],
     ['D',{v:'info'},'生活'],
     ['D',{v:'info'},'教育'],
     ['D',{v:'info'},'娱乐'],
     ['D',{v:'info'},'体育'],
   ],
   ['存在 Row','存在六个 Badge：全部/科技/生活/教育/娱乐/体育','均为 info 样式'],
  ],

  // 070 - Hero Banner
  [70,'hero-banner',
   '设计一个宣传横幅：\n- Card + Image（大）+ Column：标题"夏季大促"（heading）+ 副标题（body）+ "立即抢购"按钮（primary，onTap=shopNow）',
   ['C',{},
     ['L',{},
       ['I',{z:'large',s:'banner'}],
       ['T',{v:'heading'},'夏季大促'],
       ['T',{v:'body'},'全场五折起'],
       ['B',{v:'primary',t:'shopNow'},'立即抢购'],
     ],
   ],
   ['存在 Card','存在横幅 Image（大）','存在标题（heading）','存在副标题（body）','存在"立即抢购"按钮 primary shopNow'],
  ],

  // 071 - Feature List
  [71,'feature-list',
   '设计一个功能介绍列表：\n- 标题"核心功能"（heading）\n- 三个 Row：图标 Image（small，方形）+ Column：功能名（heading）+ 描述（body）',
   ['L',{},
     ['T',{v:'heading'},'核心功能'],
     ['R',{},['I',{z:'small',h:'square',s:'ic1'}],['L',{},['T',{v:'heading'},'智能分析'],['T',{v:'body'},'AI 数据分析']]],
     ['R',{},['I',{z:'small',h:'square',s:'ic2'}],['L',{},['T',{v:'heading'},'实时同步'],['T',{v:'body'},'多端数据同步']]],
     ['R',{},['I',{z:'small',h:'square',s:'ic3'}],['L',{},['T',{v:'heading'},'安全可靠'],['T',{v:'body'},'银行级加密']]],
   ],
   ['存在标题"核心功能"','存在三个功能 Row','每个有图标（small，方形）+ heading 功能名 + body 描述'],
  ],

  // 072 - Stats Row
  [72,'stats-row',
   '设计一个统计数字行（Row）：\n- 三个 Column：heading 数值 + caption 标签 + Badge success 趋势\n- 总用户：12,345 / +15%\n- 总订单：8,901 / +8%\n- 总收入：¥156万 / +23%',
   ['R',{},
     ['L',{},['T',{v:'heading'},'12,345'],['T',{v:'caption'},'总用户'],['D',{v:'success'},'+15%']],
     ['L',{},['T',{v:'heading'},'8,901'],['T',{v:'caption'},'总订单'],['D',{v:'success'},'+8%']],
     ['L',{},['T',{v:'heading'},'¥156万'],['T',{v:'caption'},'总收入'],['D',{v:'success'},'+23%']],
   ],
   ['存在 Row','存在三个统计 Column','每个有 heading 数值+caption 标签+Badge success 趋势',
    '总用户 12,345 +15%','总订单 8,901 +8%','总收入 ¥156万 +23%'],
  ],

  // 073 - Mini Player
  [73,'mini-player',
   '设计一个音乐迷你播放器卡片：\n- Card + Row：专辑封面 Image（中，方形）+ Column：歌名（heading）+ 歌手（caption）+ "播放"按钮（primary，onTap=playMusic）+ "下一首"按钮（ghost，onTap=nextTrack）',
   ['C',{},
     ['R',{},
       ['I',{z:'medium',h:'square',s:'album'}],
       ['L',{},['T',{v:'heading'},'晴天'],['T',{v:'caption'},'周杰伦']],
       ['B',{v:'primary',t:'playMusic'},'播放'],
       ['B',{v:'ghost',t:'nextTrack'},'下一首'],
     ],
   ],
   ['存在 Card','存在 Row','存在专辑封面（中，方形）','存在歌名（heading）+歌手（caption）',
    '存在"播放"按钮 primary playMusic','存在"下一首"按钮 ghost nextTrack'],
  ],

  // 074 - QR Code Card
  [74,'qr-code-card',
   '设计一个二维码展示卡片：\n- Card + Image（中，方形，src=qrcode）+ 标题"扫码下载"（heading）+ 说明（caption）\n- Row："保存图片"按钮（secondary，onTap=saveQRCode）+ "分享"按钮（primary，onTap=shareQRCode）',
   ['C',{},
     ['L',{},
       ['I',{z:'medium',h:'square',s:'qrcode'}],
       ['T',{v:'heading'},'扫码下载'],
       ['T',{v:'caption'},'扫描二维码下载应用'],
       ['R',{},['B',{v:'secondary',t:'saveQRCode'},'保存图片'],['B',{v:'primary',t:'shareQRCode'},'分享']],
     ],
   ],
   ['存在 Card','存在二维码 Image（中，方形）','存在标题（heading）','存在说明（caption）',
    '存在"保存图片"按钮 saveQRCode','存在"分享"按钮 primary shareQRCode'],
  ],

  // 075 - Referral Banner
  [75,'referral-banner',
   '设计一个推荐奖励横幅：\n- Card + Row：图标 Image（中）+ Column：标题"邀请有礼"（heading）+ 描述（caption）+ Badge success "邀请码：ABC" + "立即邀请"按钮（primary，onTap=referNow）',
   ['C',{},
     ['R',{},
       ['I',{z:'medium',s:'gift'}],
       ['L',{},['T',{v:'heading'},'邀请有礼'],['T',{v:'caption'},'邀请好友得¥20']],
       ['D',{v:'success'},'邀请码：ABC'],
       ['B',{v:'primary',t:'referNow'},'立即邀请'],
     ],
   ],
   ['存在 Card','存在图标 Image（中）','存在标题（heading）+描述（caption）','存在 Badge success "邀请码：ABC"','存在"立即邀请"按钮 primary referNow'],
  ],

  // 076 - Onboarding Step
  [76,'onboarding-step',
   '设计一个新手引导步骤卡片：\n- Card + Image（大）+ 标题"欢迎使用"（heading）+ 描述（body）+ Badge info "1/3" + Row："下一步"按钮（primary，onTap=nextStep）+ "跳过"链接（onTap=skipOnboarding）',
   ['C',{},
     ['L',{},
       ['I',{z:'large',s:'onboarding'}],
       ['T',{v:'heading'},'欢迎使用'],
       ['T',{v:'body'},'探索更多精彩功能。'],
       ['D',{v:'info'},'1/3'],
       ['R',{},['B',{v:'primary',t:'nextStep'},'下一步'],['K',{t:'skipOnboarding'},'跳过']],
     ],
   ],
   ['存在 Card','存在引导 Image（大）','存在标题（heading）+描述（body）','存在 Badge info "1/3"',
    '存在"下一步"按钮 primary nextStep','存在"跳过"链接 skipOnboarding'],
  ],

  // 077 - Data Table Row
  [77,'data-table-row',
   '设计一个数据表格行（Card + Row）：\n- 姓名（heading）+ 年龄 + 部门 + 状态 Badge success "在职" + "编辑"链接 + "删除"链接',
   ['C',{},
     ['R',{},
       ['T',{v:'heading'},'张三'],
       ['T',{},'28'],
       ['T',{},'技术部'],
       ['D',{v:'success'},'在职'],
       ['K',{t:'editUser'},'编辑'],
       ['K',{t:'deleteUser'},'删除'],
     ],
   ],
   ['存在 Card','存在 Row','存在姓名（heading）','存在年龄','存在部门','存在 Badge success "在职"','存在"编辑"链接 editUser','存在"删除"链接 deleteUser'],
  ],

  // 078 - Card Grid
  [78,'card-grid',
   '设计一个卡片网格行：\n- 标题"推荐内容"（heading）\n- Row 三个 Card：封面 Image（中）+ 标题 + 摘要（caption）',
   ['L',{},
     ['T',{v:'heading'},'推荐内容'],
     ['R',{},
       ['C',{},['I',{z:'medium',s:'t1'}],['T',{},'文章一'],['T',{v:'caption'},'摘要一']],
       ['C',{},['I',{z:'medium',s:'t2'}],['T',{},'文章二'],['T',{v:'caption'},'摘要二']],
       ['C',{},['I',{z:'medium',s:'t3'}],['T',{},'文章三'],['T',{v:'caption'},'摘要三']],
     ],
   ],
   ['存在标题"推荐内容"（heading）','存在三个 Card 横向排列','每个有 Image（中）+标题+摘要（caption）'],
  ],

  // 079 - Quick Actions
  [79,'quick-actions',
   '设计一个快捷操作面板：\n- 标题"快捷操作"（heading）\n- Row 四个 Card，每个含 Image（small）+ 名称（caption）\n- 新建/搜索/分享/设置',
   ['L',{},
     ['T',{v:'heading'},'快捷操作'],
     ['R',{},
       ['C',{},['I',{z:'small',s:'add'}],['T',{v:'caption'},'新建']],
       ['C',{},['I',{z:'small',s:'search'}],['T',{v:'caption'},'搜索']],
       ['C',{},['I',{z:'small',s:'share'}],['T',{v:'caption'},'分享']],
       ['C',{},['I',{z:'small',s:'settings'}],['T',{v:'caption'},'设置']],
     ],
   ],
   ['存在标题"快捷操作"（heading）','存在四个操作 Card 横向排列','每个有 Image（small）+名称（caption）','新建/搜索/分享/设置'],
  ],

  // 080 - Dashboard Overview
  [80,'dashboard-overview',
   '设计一个仪表盘概览页面：\n- 标题"控制台"（heading）\n- 两行 Row：\n  - 第一行：三个统计 Card：今日访问（heading "1,234" + body "今日访问"）、活跃用户（"856" + "活跃用户"）、总收入（"¥12.5万" + "总收入"）\n  - 第二行：三个快捷操作 Card：每个含 Image（small）+ 名称\n- 整体 Column',
   ['L',{},
     ['T',{v:'heading'},'控制台'],
     ['R',{},
       ['C',{},['T',{v:'heading'},'1,234'],['T',{v:'body'},'今日访问']],
       ['C',{},['T',{v:'heading'},'856'],['T',{v:'body'},'活跃用户']],
       ['C',{},['T',{v:'heading'},'¥12.5万'],['T',{v:'body'},'总收入']],
     ],
     ['R',{},
       ['C',{},['I',{z:'small',s:'ic-add'}],['T',{v:'caption'},'新建']],
       ['C',{},['I',{z:'small',s:'ic-search'}],['T',{v:'caption'},'搜索']],
       ['C',{},['I',{z:'small',s:'ic-export'}],['T',{v:'caption'},'导出']],
     ],
   ],
   ['存在标题"控制台"（heading）','第一行三个统计 Card（heading+body）','第二行三个快捷操作 Card（Image small+caption）'],
  ],
];

// ─── Generate ───────────────────────────────────────────────────────
const tasksDir = path.join(__dirname, '..', 'tasks');
for (const [num, name, prompt, nodes, checks] of TASKS) {
  const id = `task-${String(num).padStart(3,'0')}`;
  writeTask(id, name, prompt, nodes, checks);
}

console.log(`\nDone! Generated ${TASKS.length} tasks.`);
