import sys,json,copy,html
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import streamlit as st
import streamlit.components.v1 as components
from sqlalchemy import select,update,func
from sqlalchemy.exc import SQLAlchemyError
import storage as db
st.set_page_config(page_title='Học liệu AI · Nhà trường',page_icon='📘',layout='wide')
st.markdown('''<style>.stApp{background:#f4f8ff;color:#16375e}h1,h2,h3{color:#17488b}html,body,[class*="css"]{font-family:"Segoe UI",Arial,sans-serif}p,label,[data-testid="stMarkdownContainer"]{font-size:17px!important;line-height:1.75}section[data-testid="stSidebar"]{background:#e9f1ff}.hero{padding:30px;border-radius:20px;background:linear-gradient(120deg,#123775,#297ae9);color:white;margin:10px 0 28px}.hero h1{color:white}.hero p{color:#e4efff}button{min-height:44px;border-radius:10px!important}[data-testid="stMetric"]{background:white;border:1px solid #dae6fa;border-radius:14px;padding:20px}</style>''',unsafe_allow_html=True)
def secret(k,default=''):
 try:return st.secrets.get(k,default)
 except (FileNotFoundError,KeyError):return default
@st.cache_resource
def engine(url,allow_sqlite):return db.connect(url,allow_sqlite)
url=str(secret('DATABASE_URL'));admin=str(secret('ADMIN_USERNAME',secret('ADMIN_EMAIL')));password=str(secret('ADMIN_PASSWORD'))
if not url or not admin or len(password)<12:
 st.title('📘 Học liệu AI · Thiết lập máy chủ');st.info('Mã nguồn đã chạy. Thêm DATABASE_URL, ADMIN_USERNAME và ADMIN_PASSWORD (ít nhất 12 ký tự) tại Settings → Secrets của Streamlit để mở đăng nhập.');st.code('DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"\nADMIN_USERNAME = "admin"\nADMIN_PASSWORD = "TU_DAT_MAT_KHAU_RIENG"',language='toml');st.stop()
try:e=engine(url,bool(secret('ALLOW_SQLITE_DEMO',False)));db.bootstrap(e,admin,password)
except (ValueError,SQLAlchemyError):st.error('Chưa khởi tạo được database. Kiểm tra DATABASE_URL PostgreSQL và thông tin quản trị trong Secrets. Không gửi mật khẩu vào hội thoại.');st.stop()
def notice(err):st.error(str(err))
def logout():st.session_state.clear();st.rerun()
def load_editor(doc,id=None,revision=None):
 for k in list(st.session_state):
  if k.startswith(('draft_','act_','mat_')):del st.session_state[k]
 st.session_state.editor_doc=copy.deepcopy(doc);st.session_state.editor_id=id;st.session_state.editor_revision=revision;st.session_state['pending_page']='Xưởng sáng tạo';st.session_state.pop('learning_id',None)
def login_screen():
 st.markdown('<div class="hero"><h1>Học liệu AI</h1><p>Đăng nhập để sáng tạo, chia sẻ và học tập cùng nhà trường.</p></div>',unsafe_allow_html=True)
 left,right=st.columns([1,1]);left.markdown('### Không gian học tập đa môn\nGiáo viên tạo bài và giao hoạt động. Học sinh khám phá, luyện tập và xem kết quả. Quản trị viên duyệt đăng ký và quản lý thành viên.')
 with right:
  login,register=st.tabs(['Đăng nhập','Đăng ký'])
  with login:
   with st.form('login_form'):
    username=st.text_input('Tên tài khoản hoặc email');pwd=st.text_input('Mật khẩu',type='password');ok=st.form_submit_button('Đăng nhập',type='primary')
   if ok:
    try:
     u=db.login(e,username,pwd);st.session_state.clear();st.session_state.user_id=u['id'];st.session_state.credential_version=u['credential_version'];st.rerun()
    except ValueError as err:notice(err)
  with register:
   st.caption('Đăng ký giáo viên hoặc học sinh. Tài khoản mới cần quản trị viên duyệt.')
   with st.form('registration_form'):
    username=st.text_input('Tên tài khoản đăng ký');name=st.text_input('Họ và tên');pwd=st.text_input('Mật khẩu mới',type='password');confirm=st.text_input('Nhập lại mật khẩu',type='password');role=st.selectbox('Vai trò',['Học sinh','Giáo viên']);cls=st.text_input('Lớp (học sinh)');subject=st.selectbox('Môn giảng dạy (giáo viên)',db.SUBJECTS);ok=st.form_submit_button('Gửi đăng ký')
   if ok:
    try:
     if pwd!=confirm:raise ValueError('Mật khẩu nhập lại chưa khớp.')
     db.register(e,username,name,pwd,'teacher' if role=='Giáo viên' else 'student',cls,subject if role=='Giáo viên' else '');st.success('Đã gửi đăng ký. Đăng nhập để xem trạng thái duyệt.')
    except ValueError as err:notice(err)
if 'user_id' not in st.session_state:login_screen();st.stop()
me=db.person(e,st.session_state.user_id)
if not me or me['credential_version']!=st.session_state.get('credential_version'):st.session_state.clear();st.info('Phiên đã hết hiệu lực. Đăng nhập lại.');st.stop()
id=me['id'];role=me['role'];role_name={'admin':'Quản trị viên','teacher':'Giáo viên','student':'Học sinh'}[role]
st.sidebar.title('📘 Học liệu AI');st.sidebar.write(me['name']);st.sidebar.caption(role_name)
if st.sidebar.button('Đăng xuất'):logout()
if me['status']!='approved':
 st.title('Hồ sơ đăng ký');st.info({'pending':'Hồ sơ đang chờ quản trị viên duyệt.','rejected':'Hồ sơ đã bị từ chối. Bạn có thể cập nhật và gửi lại.','blocked':'Tài khoản đã bị khóa. Liên hệ quản trị viên.'}.get(me['status'],'Chưa được cấp quyền.'))
 if me['reason']:st.warning(me['reason'])
 if me['status'] in ['pending','rejected']:
  with st.form('resubmit'):
   name=st.text_input('Họ tên',me['name']);requested=st.selectbox('Vai trò',['student','teacher'],index=int(me['requested']=='teacher'),format_func=lambda x:'Giáo viên' if x=='teacher' else 'Học sinh');cls=st.text_input('Lớp',me['class_name']);subject=st.text_input('Môn giảng dạy',me['subject']);save=st.form_submit_button('Cập nhật và gửi lại')
  if save:
   try:db.resubmit(e,id,name,requested,cls,subject);st.rerun()
   except ValueError as err:notice(err)
 if st.button('Kiểm tra trạng thái duyệt'):st.rerun()
 st.stop()
pages=['Kho học liệu','Bài được giao','Kết quả của tôi','Tài khoản']
if role in ['admin','teacher']:pages=['Tổng quan','Kho học liệu','Học liệu của tôi','Xưởng sáng tạo','Trợ lý Gemini','Giao bài','Thống kê','Tài khoản']
if role=='admin':pages.insert(1,'Duyệt thành viên')
if st.session_state.get('pending_page') in pages:st.session_state.page=st.session_state.pop('pending_page')
if st.session_state.get('page') not in pages:st.session_state.page=pages[0]
page=st.sidebar.radio('Chức năng',pages,key='page')
def show_file(fid,lid=None):
 try:
  f=db.get_file(e,id,fid,lid);data=f['data'];mime=f['mime']
  if mime.startswith('image/'):st.image(data,caption=f['name'])
  elif mime.startswith('audio/'):st.audio(data,format=mime)
  elif mime.startswith('video/'):st.video(data,format=mime)
  elif mime=='text/html':
   source=data.decode('utf-8-sig',errors='replace');csp='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">'
   components.html('<iframe sandbox="allow-scripts" title="Học liệu HTML" style="width:100%;height:640px;border:0" srcdoc="'+html.escape(csp+source,quote=True)+'"></iframe>',height=660)
   st.caption('HTML chạy cách ly; tài nguyên ngoài mạng bị chặn. Chưa tự thu điểm từ HTML tải lên.')
  st.download_button('Tải '+f['name'],data,file_name=f['name'],mime=mime,key='download_'+fid+'_'+str(lid))
 except ValueError as err:notice(err)
def learn(lid):
 try:l=db.lesson(e,id,lid)
 except ValueError as err:notice(err);return
 doc=json.loads(l['document']);st.title(doc['title']);st.caption(f"{l['subject']} · Khối {l['grade']}")
 if st.session_state.get('opened_lesson')!=lid:db.opened(e,id,lid);st.session_state.opened_lesson=lid
 answers={}
 for ai,a in enumerate(doc['activities']):
  with st.expander(a['name'],expanded=True):
   if a.get('goal'):st.write(a['goal'])
   for mi,m in enumerate(a['materials']):
    k=f'{ai}:{mi}';w=lid+'_'+k;c=m['content'];kind=m['type'];st.subheader(m['title'])
    if kind=='Tệp tải lên':show_file(c['file_id'],lid)
    elif kind=='Trắc nghiệm':answers[k]=st.radio(c.get('question','Chọn đáp án'),c.get('options',[]),index=None,key=w)
    elif kind=='Đúng/Sai':
     answers[k]={}
     for j,item in enumerate(c.get('items',[])):
      v=st.radio(item['text'],['Đúng','Sai'],index=None,horizontal=True,key=w+'_'+str(j))
      if v is not None:answers[k][str(j)]=v=='Đúng'
    elif kind=='Điền khuyết':answers[k]=st.text_input(c.get('text','Điền đáp án'),key=w)
    elif kind in ['Thẻ ghi nhớ','Ghép đôi','Phân loại']:
     for j,p in enumerate(c.get('pairs',[])):
      if kind=='Thẻ ghi nhớ':
       with st.expander(p['left']):st.write(p['right'])
      else:answers[k+':'+str(j)]=st.selectbox(p['left'],['Chọn…']+list(dict.fromkeys(x['right'] for x in c['pairs'])),key=w+'_'+str(j))
     if kind!='Thẻ ghi nhớ':st.caption('Phần ghép/phân loại lưu lựa chọn để giáo viên xem; chưa tính điểm tự động.')
    elif kind=='Sắp xếp':
     for j in range(len(c.get('items',[]))):answers[k+':'+str(j)]=st.selectbox('Vị trí '+str(j+1),['Chọn…']+c['items'],key=w+'_'+str(j))
    elif kind=='Sơ đồ tư duy':
     st.markdown('**'+str(c.get('center',''))+'**')
     for p in c.get('pairs',[]):
      with st.expander(p['left']):st.write(p['right'])
    elif kind=='Gắn nhãn ảnh':
     if c.get('file_id'):show_file(c['file_id'],lid)
     answers[k]=st.text_area(c.get('text','Ghi tên các vị trí trên ảnh.'),key=w)
    elif kind in ['Phiếu học tập','Tình huống']:st.write(c.get('text',''));answers[k]=st.text_area('Câu trả lời của em',key=w)
    else:st.write(c.get('text',''))
 if st.button('Nộp bài luyện tập',type='primary'):
  try:
   score,maximum=db.submit(e,id,lid,answers);st.success(f'Đã lưu kết quả trên máy chủ: {score}/{maximum} điểm tự động.');st.caption('Điểm tự động: trắc nghiệm, đúng/sai và điền khuyết. Câu trả lời mở cần giáo viên xem.')
  except ValueError as err:notice(err)
 if st.button('Quay lại danh sách'):st.session_state.pop('learning_id',None);st.rerun()
if page in ['Kho học liệu','Học liệu của tôi']:
 if st.session_state.get('learning_id'):learn(st.session_state.learning_id)
 else:
  st.title(page);c1,c2,c3=st.columns([2,1,2]);subject=c1.selectbox('Môn học',['Tất cả']+db.SUBJECTS);grade=c2.selectbox('Khối',['Tất cả',6,7,8,9]);query=c3.text_input('Tìm bài học');items=db.list_lessons(e,id);items=[x for x in items if (page!='Học liệu của tôi' or x['owner']==id) and (subject=='Tất cả' or x['subject']==subject) and (grade=='Tất cả' or x['grade']==grade) and query.casefold() in x['title'].casefold()]
  if not items:st.info('Chưa có bài học. Giáo viên mở Xưởng sáng tạo để tạo và lưu bài đầu tiên.')
  for l in items:
   with st.container(border=True):
    st.subheader(l['title']);st.caption(f"{l['subject']} · Khối {l['grade']} · {l['author']} · {'Đã xuất bản' if l['published'] else 'Bản nháp'}")
    a,b=st.columns(2)
    if a.button('Vào học',key='learn_'+l['id']):st.session_state.learning_id=l['id'];st.rerun()
    if (l['owner']==id or role=='admin') and b.button('Chỉnh sửa',key='edit_'+l['id']):load_editor(json.loads(l['document']),l['id'],l['revision']);st.rerun()
elif page=='Xưởng sáng tạo':
 st.title('Xưởng sáng tạo học liệu');a,b=st.columns(2)
 if a.button('Tạo bài mới'):load_editor({'title':'Bài học mới','subject':'Tin học','grade':7,'activities':[{'name':s,'goal':'','minutes':7,'materials':[]} for s in db.STAGES]});st.rerun()
 if b.button('Dùng mẫu Thiết bị vào – ra'):load_editor(db.sample());st.rerun()
 if 'editor_doc' not in st.session_state:load_editor(db.sample())
 d=st.session_state.editor_doc;d['title']=st.text_input('Tên bài học',d['title'],key='draft_title');a,b=st.columns(2);d['subject']=a.selectbox('Môn học',db.SUBJECTS,index=db.SUBJECTS.index(d['subject']),key='draft_subject');d['grade']=b.selectbox('Khối lớp',[6,7,8,9],index=d['grade']-6,key='draft_grade')
 i=st.selectbox('Hoạt động đang thiết kế',range(len(d['activities'])),format_func=lambda i:d['activities'][i]['name'],key='draft_activity');act=d['activities'][i];act['goal']=st.text_area('Mục tiêu hoạt động',act.get('goal',''),key='act_goal_'+str(i));act['minutes']=st.number_input('Thời lượng (phút)',1,120,int(act.get('minutes',7)),key='act_minutes_'+str(i))
 for j,m in enumerate(act['materials']):
  with st.container(border=True):
   st.write(f"**{m['title']}** · {m['type']}")
   if m['type']=='Tệp tải lên':st.caption(m['content'].get('name','Tệp đã tải lên'))
   else:st.json(m['content'],expanded=False)
   if st.button('Gỡ học liệu khỏi hoạt động',key=f'mat_remove_{i}_{j}'):act['materials'].pop(j);st.rerun()
 st.subheader('Thêm học liệu');kind=st.selectbox('Loại học liệu',db.TYPES,key='mat_type')
 with st.form('material_form',clear_on_submit=True):
  title=st.text_input('Tên học liệu');text=st.text_area('Nội dung / câu hỏi / hướng dẫn');options=st.text_area('Phương án trắc nghiệm hoặc các bước (mỗi dòng một mục)');answer=st.text_input('Đáp án đúng (trắc nghiệm phải trùng một phương án)');pairs=st.text_area('Cặp ghép / thẻ / nhận định (mỗi dòng: nội dung | đáp án; đúng/sai dùng true hoặc false)');upload=st.file_uploader('Tệp từ máy tính, tối đa 20 MB',type=list(db.MIMES));add=st.form_submit_button('Thêm vào hoạt động')
 if add:
  try:
   if not title.strip():raise ValueError('Nhập tên học liệu.')
   c={'text':text};lines=[x.strip() for x in options.splitlines() if x.strip()]
   if kind=='Trắc nghiệm':
    if len(lines)<2 or answer not in lines:raise ValueError('Cần ít nhất hai phương án và đáp án trùng một phương án.')
    c={'question':text,'options':lines,'answer':answer}
   elif kind=='Điền khuyết':c={'text':text,'answer':answer}
   elif kind in ['Thẻ ghi nhớ','Ghép đôi','Phân loại','Sơ đồ tư duy','Đúng/Sai']:
    ps=[]
    for line in pairs.splitlines():
     if line.strip():
      if '|' not in line:raise ValueError('Mỗi dòng cần dấu | phân cách.')
      l,r=line.split('|',1);ps.append({'left':l.strip(),'right':r.strip()})
    if not ps:raise ValueError('Nhập ít nhất một dòng dữ liệu.')
    if kind=='Đúng/Sai':
     if any(x['right'].lower() not in ['true','false'] for x in ps):raise ValueError('Đáp án đúng/sai phải là true hoặc false.')
     c={'items':[{'text':x['left'],'answer':x['right'].lower()=='true'} for x in ps]}
    else:c={'pairs':ps,'center':text}
   elif kind=='Sắp xếp':c={'items':lines,'text':text}
   elif kind in ['Tệp tải lên','Gắn nhãn ảnh']:
    if not upload:raise ValueError('Chọn tệp cần tải lên.')
    c={'file_id':db.save_file(e,id,upload.name,upload.getvalue()),'name':upload.name,'text':text}
   act['materials'].append({'type':kind,'title':title.strip(),'content':c});st.rerun()
  except ValueError as err:notice(err)
 with st.expander('Biên tập toàn bộ cấu trúc / nhập JSON'):
  source=st.text_area('JSON bài học',json.dumps(d,ensure_ascii=False,indent=2),height=320,key='draft_json')
  if st.button('Áp dụng JSON'):
   try:load_editor(db.valid_document(json.loads(source)),st.session_state.get('editor_id'),st.session_state.get('editor_revision'));st.rerun()
   except (ValueError,TypeError,KeyError) as err:notice(err)
  st.download_button('Xuất bản sao JSON',json.dumps(d,ensure_ascii=False,indent=2),file_name='bai-hoc.json',mime='application/json')
 a,b=st.columns(2)
 for col,label,published in [(a,'Lưu bản nháp',False),(b,'Lưu và xuất bản',True)]:
  if col.button(label,type='primary' if published else 'secondary'):
   try:
    lid,rev=db.save_lesson(e,id,d,st.session_state.get('editor_id'),st.session_state.get('editor_revision'),published);st.session_state.editor_id=lid;st.session_state.editor_revision=rev;st.success('Đã lưu bài học trên database. Có thể mở trên thiết bị khác.')
   except ValueError as err:notice(err)
elif page=='Duyệt thành viên':
 st.title('Đăng ký & thành viên');status=st.selectbox('Trạng thái',['pending','approved','rejected','blocked'],format_func=lambda x:{'pending':'Chờ duyệt','approved':'Đã duyệt','rejected':'Từ chối','blocked':'Bị khóa'}[x]);people=db.rows(e,select(db.U).where(db.U.c.status==status).order_by(db.U.c.created.desc()))
 for u in people:
  with st.expander(f"{u['name']} · {u['username']} · {u['class_name'] or u['subject']}"):
   st.write('Đăng ký: '+{'student':'Học sinh','teacher':'Giáo viên'}[u['requested']]);reason=st.text_input('Lý do từ chối / khóa',key='reason_'+u['id'])
   if u['role']!='admin':
    actions={'pending':[('Duyệt','approve'),('Từ chối','reject')],'approved':[('Khóa','block')],'blocked':[('Mở khóa','unblock')],'rejected':[]}[status]
    for label,action in actions:
     if st.button(label,key=action+u['id']):
      try:db.review(e,id,u['id'],action,u['revision'],reason);st.rerun()
      except ValueError as err:notice(err)
    with st.form('reset_'+u['id']):
     pwd=st.text_input('Mật khẩu mới cho thành viên',type='password');reset=st.form_submit_button('Đặt lại mật khẩu')
    if reset:
     try:db.change_password(e,id,u['id'],pwd);st.success('Đã đổi mật khẩu và vô hiệu hóa phiên cũ.')
     except ValueError as err:notice(err)
elif page in ['Giao bài','Bài được giao']:
 st.title(page)
 if role in ['teacher','admin']:
  owned=[l for l in db.list_lessons(e,id) if l['published'] and (l['owner']==id or role=='admin')]
  if owned:
   with st.form('assign'):
    lid=st.selectbox('Bài học',range(len(owned)),format_func=lambda j:owned[j]['title']);cls=st.text_input('Lớp nhận bài (phải trùng lớp trong hồ sơ học sinh)');send=st.form_submit_button('Giao bài')
   if send:
    try:db.assign(e,id,owned[lid]['id'],cls);st.success('Đã lưu giao bài.')
    except ValueError as err:notice(err)
 for a in db.assignments(e,id):
  st.write(f"**{a['title']}** · Lớp {a['class_name']}")
  if st.button('Vào học',key='assignment_'+a['id']):st.session_state.learning_id=a['lesson'];st.session_state.pending_page='Kho học liệu';st.rerun()
elif page=='Kết quả của tôi':
 st.title(page);attempts=db.my_attempts(e,id)
 if not attempts:st.info('Chưa có bài đã nộp.')
 for a in attempts:st.write(f"{a['title']} · {a['score']}/{a['maximum']} · {a['created']}")
elif page=='Trợ lý Gemini':
 st.title('Trợ lý soạn yêu cầu Gemini');subject=st.selectbox('Môn học',db.SUBJECTS);grade=st.selectbox('Khối lớp',[6,7,8,9]);topic=st.text_input('Tên bài');kind=st.selectbox('Loại học liệu',db.TYPES+['Hình ảnh','Kịch bản video']);goal=st.text_area('Mục tiêu và yêu cầu')
 prompt=f'Tạo học liệu {kind} cho bài {topic}, môn {subject}, lớp {grade}. Mục tiêu: {goal}. Ngôn ngữ tiếng Việt, nội dung chính xác và phù hợp lứa tuổi. Nếu tạo tương tác HTML, xuất một tệp tự chứa HTML/CSS/JS, không dùng CDN hoặc API, có hướng dẫn và phản hồi, không thu thập thông tin cá nhân.'
 st.text_area('Sao chép yêu cầu này',prompt,height=220);st.link_button('Mở Gemini','https://gemini.google.com/app');st.caption('Thực hiện yêu cầu tại Gemini, tải kết quả về rồi đưa vào Xưởng sáng tạo. Website không kết nối API AI.')
elif page=='Tài khoản':
 st.title('Tài khoản của tôi');st.write(me['name']+' · '+role_name)
 with st.form('password'):
  current=st.text_input('Mật khẩu hiện tại',type='password');pwd=st.text_input('Mật khẩu mới',type='password');confirm=st.text_input('Nhập lại mật khẩu mới',type='password');ok=st.form_submit_button('Đổi mật khẩu')
 if ok:
  try:
   if pwd!=confirm:raise ValueError('Mật khẩu nhập lại chưa khớp.')
   db.change_password(e,id,id,pwd,current);logout()
  except ValueError as err:notice(err)
elif page in ['Tổng quan','Thống kê']:
 st.title('Thống kê hoạt động thực');lessons=db.list_lessons(e,id);events=db.rows(e,select(db.E));attempts=db.rows(e,select(db.A));people=db.rows(e,select(db.U.c.id,db.U.c.name,db.U.c.role));names={u['id']:u['name'] for u in people};students={u['id'] for u in people if u['role']=='student'}
 cols=st.columns(3);cols[0].metric('Bài học',len(lessons));cols[1].metric('Lượt mở bài',len(events));cols[2].metric('Học sinh đã nộp',len({a['student'] for a in attempts if a['student'] in students}));subject=st.selectbox('Lọc môn',['Tất cả']+db.SUBJECTS)
 ranked=[{'Bài học':l['title'],'Môn':l['subject'],'Giáo viên':names.get(l['owner'],''),'Lượt mở':sum(x['lesson']==l['id'] for x in events)} for l in lessons if subject=='Tất cả' or subject==l['subject']];st.subheader('Học liệu được mở nhiều nhất');st.dataframe(sorted(ranked,key=lambda x:x['Lượt mở'],reverse=True),hide_index=True)
 teachers=[]
 for u in people:
  if u['role'] in ['teacher','admin']:
   own={l['id'] for l in lessons if l['owner']==u['id']};teachers.append({'Giáo viên':u['name'],'Số bài tạo':len(own),'Lượt tương tác':sum(x['lesson'] in own for x in events)})
 st.subheader('Giáo viên tạo nhiều bài nhất');st.dataframe(sorted(teachers,key=lambda x:x['Số bài tạo'],reverse=True),hide_index=True);st.subheader('Giáo viên có nhiều tương tác nhất');st.dataframe(sorted(teachers,key=lambda x:x['Lượt tương tác'],reverse=True),hide_index=True)
 ranking=[]
 for sid in students:
  aa=[a for a in attempts if a['student']==sid];graded=[a for a in aa if a['maximum']>0]
  if aa:ranking.append({'Học sinh':names.get(sid,''),'Số bài tham gia':len({a['lesson'] for a in aa}),'Lượt nộp':len(aa),'Điểm trung bình (%)':round(sum(100*a['score']/a['maximum'] for a in graded)/len(graded),1) if graded else None})
 st.subheader('Học sinh tham gia nhiều nhất');st.dataframe(sorted(ranking,key=lambda x:x['Số bài tham gia'],reverse=True),hide_index=True);st.subheader('Học sinh có kết quả luyện tập cao nhất');st.dataframe(sorted([x for x in ranking if x['Điểm trung bình (%)'] is not None],key=lambda x:x['Điểm trung bình (%)'],reverse=True),hide_index=True);st.caption('Lượt mở có thể lặp lại. Điểm là kết quả luyện tập; chưa phải kỳ thi có giám sát. Không dùng số liệu mẫu.')
