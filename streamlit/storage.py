import hashlib,hmac,secrets,json,uuid,re,time
from datetime import datetime,timezone
from sqlalchemy import create_engine,MetaData,Table,Column,String,Text,Integer,LargeBinary,select,insert,update,func,delete
from sqlalchemy.exc import IntegrityError
M=MetaData()
U=Table('hl3_users',M,Column('id',String(40),primary_key=True),Column('username',String(80),unique=True,nullable=False),Column('name',String(120),nullable=False),Column('password',Text,nullable=False),Column('role',String(20),nullable=False),Column('status',String(20),nullable=False),Column('requested',String(20),nullable=False),Column('class_name',String(80),default=''),Column('subject',String(120),default=''),Column('reason',String(500),default=''),Column('revision',Integer,default=1),Column('credential_version',Integer,default=1),Column('created',String(40)))
L=Table('hl3_lessons',M,Column('id',String(40),primary_key=True),Column('owner',String(40),nullable=False),Column('title',String(200)),Column('subject',String(100)),Column('grade',Integer),Column('published',Integer),Column('document',Text),Column('revision',Integer),Column('updated',String(40)))
F=Table('hl3_files',M,Column('id',String(40),primary_key=True),Column('owner',String(40)),Column('name',String(200)),Column('mime',String(150)),Column('data',LargeBinary),Column('created',String(40)))
E=Table('hl3_events',M,Column('id',String(40),primary_key=True),Column('lesson',String(40)),Column('student',String(40)),Column('kind',String(20)),Column('created',String(40)))
A=Table('hl3_attempts',M,Column('id',String(40),primary_key=True),Column('lesson',String(40)),Column('student',String(40)),Column('answers',Text),Column('score',Integer),Column('maximum',Integer),Column('created',String(40)))
G=Table('hl3_assignments',M,Column('id',String(40),primary_key=True),Column('lesson',String(40)),Column('owner',String(40)),Column('class_name',String(80)),Column('created',String(40)))
R=Table('hl3_login_limits',M,Column('key',String(120),primary_key=True),Column('count',Integer),Column('expires',Integer))
SUBJECTS=['Tin học','Toán','Ngữ văn','Khoa học tự nhiên','Lịch sử và Địa lí','Tiếng Anh','Giáo dục công dân','Công nghệ','Nghệ thuật','Giáo dục thể chất','Hoạt động trải nghiệm','Giáo dục địa phương']
STAGES=['Khởi động','Hình thành kiến thức','Luyện tập','Vận dụng','Tự kiểm tra']
TYPES=['Bài đọc','Trắc nghiệm','Đúng/Sai','Thẻ ghi nhớ','Điền khuyết','Ghép đôi','Phân loại','Sắp xếp','Sơ đồ tư duy','Gắn nhãn ảnh','Phiếu học tập','Tình huống','Tệp tải lên']
MIMES={'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp','gif':'image/gif','mp3':'audio/mpeg','wav':'audio/wav','ogg':'audio/ogg','m4a':'audio/mp4','mp4':'video/mp4','webm':'video/webm','pdf':'application/pdf','docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','html':'text/html','htm':'text/html'}
def now():return datetime.now(timezone.utc).isoformat()
def uid():return uuid.uuid4().hex
def hashed(password):
 salt=secrets.token_hex(16);return salt+':'+hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),600000).hex()
def check(password,value):
 try:salt,digest=value.split(':');return hmac.compare_digest(hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),600000).hex(),digest)
 except (ValueError,AttributeError):return False
DUMMY=hashed('not-a-real-account-password')
def connect(url,allow_sqlite=False):
 if url.startswith('sqlite') and not allow_sqlite:raise ValueError('Cần DATABASE_URL PostgreSQL; SQLite chỉ dành cho kiểm thử hoặc chế độ demo có chủ ý.')
 if url.startswith('postgres://'):url='postgresql://'+url[len('postgres://'):]
 if url.startswith('postgresql://'):url=url.replace('postgresql://','postgresql+psycopg://',1)
 e=create_engine(url,pool_pre_ping=True,**({'connect_args':{'check_same_thread':False}} if url.startswith('sqlite') else {'pool_size':3,'max_overflow':2,'connect_args':{'connect_timeout':15}}));M.create_all(e);return e
def rows(e,q):
 with e.connect() as c:return [dict(r) for r in c.execute(q).mappings()]
def person(e,id):
 data=rows(e,select(U).where(U.c.id==id));return data[0] if data else None
def require(e,id,teacher=False):
 u=person(e,id)
 if not u or u['status']!='approved':raise ValueError('Tài khoản chưa được duyệt hoặc đã bị khóa.')
 if teacher and u['role'] not in ['admin','teacher']:raise ValueError('Chỉ giáo viên được thực hiện thao tác này.')
 return u
def register(e,username,name,password,requested,class_name='',subject='',admin=False):
 username=username.strip().lower();name=name.strip()
 if not re.fullmatch(r'[a-z0-9][a-z0-9._@+\-]{2,79}',username):raise ValueError('Tên tài khoản cần 3–80 ký tự không dấu, số, . _ @ + -')
 if not 2<=len(name)<=120 or not 10<=len(password)<=128:raise ValueError('Họ tên cần 2–120 ký tự; mật khẩu cần 10–128 ký tự.')
 if requested not in ['student','teacher']:raise ValueError('Vai trò không hợp lệ.')
 if len(class_name)>80 or len(subject)>120 or (not admin and ((requested=='student' and not class_name.strip()) or (requested=='teacher' and not subject.strip()))):raise ValueError('Nhập lớp hoặc môn giảng dạy.')
 id=uid()
 try:
  with e.begin() as c:c.execute(insert(U).values(id=id,username=username,name=name,password=hashed(password),role='admin' if admin else 'student',status='approved' if admin else 'pending',requested=requested,class_name=class_name.strip(),subject=subject.strip(),reason='',revision=1,credential_version=1,created=now()))
 except IntegrityError:raise ValueError('Tên tài khoản đã tồn tại.') from None
 return id
def bootstrap(e,username,password):
 if len(password)<12:raise ValueError('Mật khẩu quản trị cần ít nhất 12 ký tự.')
 if not rows(e,select(U.c.id).where(U.c.role=='admin')):
  try:register(e,username,'Quản trị viên',password,'student',admin=True)
  except ValueError:
   if not rows(e,select(U.c.id).where(U.c.role=='admin')):raise

def login(e,username,password):
 username=username.strip().lower();key=username+':'+str(int(time.time())//900);found=rows(e,select(R).where(R.c.key==key))
 if found and found[0]['count']>=10:raise ValueError('Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.')
 data=rows(e,select(U).where(U.c.username==username));u=data[0] if data else None
 if not check(password,u['password'] if u else DUMMY):
  with e.begin() as c:
   c.execute(delete(R).where(R.c.expires<int(time.time())))
   r=c.execute(update(R).where(R.c.key==key).values(count=R.c.count+1))
   if not r.rowcount:c.execute(insert(R).values(key=key,count=1,expires=int(time.time())+900))
  raise ValueError('Tên tài khoản hoặc mật khẩu chưa đúng.')
 if u['status']=='blocked':raise ValueError('Tài khoản đã bị khóa. Liên hệ quản trị viên.')
 return u

def review(e,admin_id,target_id,action,revision,reason=''):
 admin=require(e,admin_id)
 if admin['role']!='admin':raise ValueError('Chỉ quản trị viên được duyệt thành viên.')
 t=person(e,target_id)
 if not t or t['role']=='admin' or action not in ['approve','reject','block','unblock']:raise ValueError('Không được thay đổi tài khoản này.')
 allowed={'approve':'pending','reject':'pending','block':'approved','unblock':'blocked'}
 if t['status']!=allowed[action]:raise ValueError('Trạng thái đã thay đổi. Vui lòng tải lại.')
 if len(reason)>500 or (action in ['reject','block'] and not reason.strip()):raise ValueError('Nhập lý do, tối đa 500 ký tự.')
 with e.begin() as c:
  r=c.execute(update(U).where(U.c.id==target_id,U.c.revision==revision,U.c.status==allowed[action]).values(status={'approve':'approved','reject':'rejected','block':'blocked','unblock':'approved'}[action],role=t['requested'] if action=='approve' else t['role'],reason=reason.strip(),revision=revision+1))
  if not r.rowcount:raise ValueError('Hồ sơ vừa thay đổi. Hãy tải lại trước khi duyệt.')
def resubmit(e,id,name,requested,class_name,subject):
 u=person(e,id)
 if not u or u['status'] not in ['pending','rejected']:raise ValueError('Không thể gửi lại hồ sơ ở trạng thái này.')
 if not 2<=len(name.strip())<=120 or requested not in ['teacher','student'] or len(class_name)>80 or len(subject)>120 or (requested=='student' and not class_name.strip()) or (requested=='teacher' and not subject.strip()):raise ValueError('Thông tin hồ sơ chưa hợp lệ.')
 with e.begin() as c:c.execute(update(U).where(U.c.id==id,U.c.status.in_(['pending','rejected'])).values(name=name.strip(),requested=requested,class_name=class_name.strip(),subject=subject.strip(),status='pending',reason='',revision=U.c.revision+1))
def change_password(e,actor,target,password,current=None):
 a=require(e,actor);t=person(e,target)
 if not t or (actor!=target and (a['role']!='admin' or t['role']=='admin')):raise ValueError('Không được đổi mật khẩu tài khoản này.')
 if actor==target and not check(current or '',a['password']):raise ValueError('Mật khẩu hiện tại chưa đúng.')
 if not 10<=len(password)<=128:raise ValueError('Mật khẩu mới cần 10–128 ký tự.')
 with e.begin() as c:c.execute(update(U).where(U.c.id==target).values(password=hashed(password),credential_version=U.c.credential_version+1))
def valid_document(d):
 if not isinstance(d,dict) or not isinstance(d.get('title'),str) or not 1<=len(d['title'].strip())<=200 or d.get('subject') not in SUBJECTS or d.get('grade') not in [6,7,8,9] or not isinstance(d.get('activities'),list) or not 1<=len(d['activities'])<=30:raise ValueError('Thông tin bài học chưa hợp lệ.')
 if len(json.dumps(d,ensure_ascii=False).encode())>1000000:raise ValueError('Nội dung bài tối đa 1 MB; tải media bằng phần Tệp.')
 for a in d['activities']:
  if not isinstance(a,dict) or not isinstance(a.get('materials'),list) or not isinstance(a.get('name'),str) or len(a['materials'])>50:raise ValueError('Hoạt động chưa đúng cấu trúc.')
  for m in a['materials']:
   if not isinstance(m,dict) or m.get('type') not in TYPES or not isinstance(m.get('title'),str) or not isinstance(m.get('content'),dict):raise ValueError('Học liệu chưa đúng cấu trúc.')
 for a in d['activities']:
  for m in a['materials']:
   c=m['content'];kind=m['type']
   if kind=='Trắc nghiệm' and (not isinstance(c.get('options'),list) or not 2<=len(c['options'])<=20 or not all(isinstance(x,str) for x in c['options']) or c.get('answer') not in c['options']):raise ValueError('Trắc nghiệm cần các phương án và đáp án đúng hợp lệ.')
   if kind=='Đúng/Sai' and (not isinstance(c.get('items'),list) or not c['items'] or any(not isinstance(x,dict) or not isinstance(x.get('text'),str) or type(x.get('answer')) is not bool for x in c['items'])):raise ValueError('Nhận định đúng/sai chưa hợp lệ.')
   if kind in ['Thẻ ghi nhớ','Ghép đôi','Phân loại','Sơ đồ tư duy'] and (not isinstance(c.get('pairs'),list) or any(not isinstance(x,dict) or not isinstance(x.get('left'),str) or not isinstance(x.get('right'),str) for x in c['pairs'])):raise ValueError('Danh sách cặp ghép chưa hợp lệ.')
   if kind=='Sắp xếp' and (not isinstance(c.get('items'),list) or not all(isinstance(x,str) for x in c['items'])):raise ValueError('Các bước chưa hợp lệ.')
   if kind=='Điền khuyết' and (not isinstance(c.get('answer'),str) or not c['answer'].strip()):raise ValueError('Nhập đáp án điền khuyết.')
   if kind in ['Tệp tải lên','Gắn nhãn ảnh'] and not isinstance(c.get('file_id'),str):raise ValueError('Thiếu mã tệp.')
 return d

def lesson(e,actor,id,edit=False):
 u=require(e,actor,edit);r=rows(e,select(L).where(L.c.id==id))
 if not r:raise ValueError('Không tìm thấy bài học.')
 l=r[0]
 if edit and not (l['owner']==actor or u['role']=='admin'):raise ValueError('Không được sửa bài của giáo viên khác.')
 if not edit and not (l['published'] or l['owner']==actor or u['role']=='admin'):raise ValueError('Bài học chưa xuất bản.')
 return l

def save_lesson(e,actor,doc,id=None,revision=None,publish=False):
 require(e,actor,True);valid_document(doc)
 for a in doc['activities']:
  for m in a['materials']:
   if m['content'].get('file_id'):get_file(e,actor,m['content']['file_id'])
 v=dict(title=doc['title'],subject=doc['subject'],grade=doc['grade'],published=int(publish),document=json.dumps(doc,ensure_ascii=False),updated=now())
 if id:
  lesson(e,actor,id,True)
  with e.begin() as c:
   r=c.execute(update(L).where(L.c.id==id,L.c.revision==revision).values(**v,revision=revision+1))
   if not r.rowcount:raise ValueError('Bài đã thay đổi ở thiết bị khác. Hãy mở lại trước khi lưu.')
  return id,revision+1
 id=uid()
 with e.begin() as c:c.execute(insert(L).values(id=id,owner=actor,revision=1,**v))
 return id,1

def list_lessons(e,actor):
 u=require(e,actor);q=select(L,U.c.name.label('author')).join(U,L.c.owner==U.c.id).order_by(L.c.updated.desc())
 if u['role']!='admin':q=q.where((L.c.published==1)|(L.c.owner==actor))
 return rows(e,q)
def save_file(e,actor,name,data):
 require(e,actor,True);ext=name.rsplit('.',1)[-1].lower()
 if ext not in MIMES or not data or len(data)>20*1024*1024:raise ValueError('Định dạng không hỗ trợ hoặc tệp vượt 20 MB.')
 if ext=='pdf' and not data.startswith(b'%PDF-'):raise ValueError('Tệp PDF chưa hợp lệ.')
 if ext in ['docx','pptx','xlsx'] and not data.startswith(b'PK'):raise ValueError('Tệp Office chưa hợp lệ.')
 id=uid()
 with e.begin() as c:c.execute(insert(F).values(id=id,owner=actor,name=name[:200],mime=MIMES[ext],data=data,created=now()))
 return id

def get_file(e,actor,id,lesson_id=None):
 u=require(e,actor);q=select(F).where(F.c.id==id);r=rows(e,q)
 if not r:raise ValueError('Không tìm thấy tệp.')
 f=r[0]
 if f['owner']==actor or u['role']=='admin':return f
 if lesson_id:
  l=lesson(e,actor,lesson_id);d=json.loads(l['document'])
  if any(m['content'].get('file_id')==id for a in d['activities'] for m in a['materials']):return f
 raise ValueError('Không được truy cập tệp này.')
def opened(e,actor,id):
 lesson(e,actor,id)
 with e.begin() as c:c.execute(insert(E).values(id=uid(),lesson=id,student=actor,kind='open',created=now()))
def grade(doc,answers):
 score=maximum=0
 for ai,a in enumerate(doc['activities']):
  for mi,m in enumerate(a['materials']):
   key=f'{ai}:{mi}';c=m['content'];v=answers.get(key)
   if m['type']=='Trắc nghiệm':maximum+=1;score+=int(v==c.get('answer'))
   elif m['type']=='Đúng/Sai':
    for i,s in enumerate(c.get('items',[])):maximum+=1;score+=int(isinstance(v,dict) and v.get(str(i)) is s['answer'])
   elif m['type']=='Điền khuyết':maximum+=1;score+=int(isinstance(v,str) and v.strip().casefold()==str(c.get('answer','')).strip().casefold())
 return int(score),maximum
def submit(e,actor,id,answers):
 l=lesson(e,actor,id);score,maximum=grade(json.loads(l['document']),answers)
 with e.begin() as c:c.execute(insert(A).values(id=uid(),lesson=id,student=actor,answers=json.dumps({'revision':l['revision'],'answers':answers},ensure_ascii=False),score=score,maximum=maximum,created=now()))
 return score,maximum

def assign(e,actor,id,class_name):
 l=lesson(e,actor,id,True)
 if not l['published'] or not class_name.strip() or len(class_name)>80:raise ValueError('Xuất bản bài và nhập tên lớp hợp lệ trước khi giao.')
 with e.begin() as c:c.execute(insert(G).values(id=uid(),lesson=id,owner=actor,class_name=class_name.strip(),created=now()))
def assignments(e,actor):
 u=require(e,actor);q=select(G,L.c.title).join(L,G.c.lesson==L.c.id).where(L.c.published==1)
 if u['role']=='student':q=q.where(G.c.class_name==u['class_name'])
 return rows(e,q.order_by(G.c.created.desc()))
def my_attempts(e,actor):
 require(e,actor);return rows(e,select(A,L.c.title).join(L,A.c.lesson==L.c.id).where(A.c.student==actor).order_by(A.c.created.desc()))
def sample():
 d={'title':'Bài 1: Thiết bị vào – ra','subject':'Tin học','grade':7,'activities':[{'name':s,'goal':'','minutes':7,'materials':[]} for s in STAGES]}
 contents=[('Bài đọc',{'text':'Em đã dùng bàn phím, micro, màn hình và loa như thế nào?'}),('Thẻ ghi nhớ',{'pairs':[{'left':'Bàn phím','right':'Thiết bị vào: nhập chữ và số.'},{'left':'Micro','right':'Thiết bị vào: thu âm thanh.'},{'left':'Màn hình','right':'Thiết bị ra: hiển thị thông tin.'},{'left':'Loa','right':'Thiết bị ra: phát âm thanh.'}]}),('Trắc nghiệm',{'question':'Thiết bị nào đưa âm thanh vào máy tính?','options':['Micro','Loa','Màn hình'],'answer':'Micro'}),('Phiếu học tập',{'text':'Em cần ghi âm bài thuyết trình rồi nghe lại. Hãy chọn thiết bị phù hợp và giải thích.'}),('Đúng/Sai',{'items':[{'text':'Bàn phím là thiết bị vào.','answer':True},{'text':'Loa là thiết bị vào.','answer':False}]})]
 for a,(kind,c) in zip(d['activities'],contents):a['materials'].append({'type':kind,'title':a['name'],'content':c})
 return d
