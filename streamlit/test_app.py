import unittest,tempfile,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import storage as d
from sqlalchemy import select
class StorageTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.e=d.connect('sqlite:///'+str(Path(self.tmp.name)/'app.db'),True);self.admin=d.register(self.e,'admin','Admin','Admin-password-123','student',admin=True)
 def tearDown(self):self.e.dispose();self.tmp.cleanup()
 def approve(self,who,action='approve',reason=''):
  u=d.person(self.e,who);d.review(self.e,self.admin,who,action,u['revision'],reason)
 def test_pending_and_role(self):
  u=d.register(self.e,'teacher','Giáo viên','Password-12345','teacher',subject='Tin học');self.assertEqual(d.person(self.e,u)['role'],'student')
  with self.assertRaises(ValueError):d.save_lesson(self.e,u,d.sample())
  self.approve(u);self.assertEqual(d.person(self.e,u)['role'],'teacher');d.save_lesson(self.e,u,d.sample())
  with self.assertRaises(ValueError):d.review(self.e,u,self.admin,'block',1,'x')
 def test_save_revision_permissions_and_real_grading(self):
  lid,rev=d.save_lesson(self.e,self.admin,d.sample(),publish=True);s=d.register(self.e,'hs7a','Học sinh','Password-12345','student',class_name='7A');self.approve(s)
  with self.assertRaises(ValueError):d.save_lesson(self.e,s,d.sample(),lid,rev)
  d.save_lesson(self.e,self.admin,d.sample(),lid,rev,True)
  with self.assertRaises(ValueError):d.save_lesson(self.e,self.admin,d.sample(),lid,rev)
  self.assertEqual(d.submit(self.e,s,lid,{'2:0':'Micro','4:0':{'0':True,'1':False}}),(3,3));self.assertEqual(len(d.my_attempts(self.e,s)),1)
 def test_reject_resubmit_block_password(self):
  u=d.register(self.e,'hs1','Học sinh','Password-12345','student',class_name='7A');self.approve(u,'reject','Sửa lớp');d.resubmit(self.e,u,'Học sinh','student','7B','');self.approve(u);old=d.person(self.e,u)['credential_version'];d.change_password(self.e,self.admin,u,'Changed-password-123');self.assertGreater(d.person(self.e,u)['credential_version'],old)
  with self.assertRaises(ValueError):d.login(self.e,'hs1','Password-12345')
  self.approve(u,'block','Tạm khóa')
  with self.assertRaises(ValueError):d.login(self.e,'hs1','Changed-password-123')
 def test_files_protected_and_bytes_persisted(self):
  fid=d.save_file(self.e,self.admin,'readme.pdf',b'%PDF-sample');s=d.register(self.e,'hsfile','Học sinh','Password-12345','student',class_name='7A');self.approve(s)
  with self.assertRaises(ValueError):d.get_file(self.e,s,fid)
  doc=d.sample();doc['activities'][0]['materials'].append({'type':'Tệp tải lên','title':'PDF','content':{'file_id':fid}});lid,_=d.save_lesson(self.e,self.admin,doc,publish=True);self.assertEqual(d.get_file(self.e,s,fid,lid)['data'],b'%PDF-sample')
  with self.assertRaises(ValueError):d.save_file(self.e,self.admin,'bad.pdf',b'notpdf')
 def test_sqlite_is_explicit_and_login_throttled(self):
  with self.assertRaises(ValueError):d.connect('sqlite:///:memory:')
  for _ in range(10):
   with self.assertRaises(ValueError):d.login(self.e,'unknown','wrong')
  with self.assertRaisesRegex(ValueError,'Quá nhiều'):d.login(self.e,'unknown','wrong')
 def test_class_assignment_filter(self):
  lid,_=d.save_lesson(self.e,self.admin,d.sample(),publish=True);d.assign(self.e,self.admin,lid,'7A');s=d.register(self.e,'hs7b','Học sinh','Password-12345','student',class_name='7B');self.approve(s);self.assertEqual(d.assignments(self.e,s),[])
class UITest(unittest.TestCase):
 def app(self,path):
  from streamlit.testing.v1 import AppTest
  a=AppTest.from_file(str(Path(__file__).with_name('streamlit_app.py')),default_timeout=30);a.secrets.update({'DATABASE_URL':'sqlite:///'+str(path),'ALLOW_SQLITE_DEMO':True,'ADMIN_USERNAME':'admin','ADMIN_PASSWORD':'Admin-password-123'});return a.run()
 def test_login_editor_save_reload(self):
  with tempfile.TemporaryDirectory() as tmp:
   at=self.app(Path(tmp)/'ui.db');self.assertEqual(len(at.exception),0);at.text_input[0].set_value('admin');at.text_input[1].set_value('Admin-password-123');next(x for x in at.button if x.label=='Đăng nhập').click().run();self.assertEqual(len(at.exception),0)
   next(x for x in at.radio if x.label=='Chức năng').set_value('Xưởng sáng tạo').run();self.assertEqual(len(at.exception),0);next(x for x in at.button if x.label=='Lưu và xuất bản').click().run();self.assertEqual(len(at.exception),0);self.assertTrue(any('Đã lưu' in x.value for x in at.success));next(x for x in at.radio if x.label=='Chức năng').set_value('Học liệu của tôi').run();next(x for x in at.button if x.label=='Chỉnh sửa').click().run();self.assertEqual(len(at.exception),0)
 def test_registration_waiting_no_library(self):
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'pending.db';at=self.app(path);e=d.connect('sqlite:///'+str(path),True);d.register(e,'pending','Thành viên','Password-12345','teacher',subject='Tin học');at.text_input[0].set_value('pending');at.text_input[1].set_value('Password-12345');next(x for x in at.button if x.label=='Đăng nhập').click().run();self.assertEqual(len(at.exception),0);self.assertTrue(any('chờ' in x.value for x in at.info));self.assertFalse(any(x.label=='Chức năng' for x in at.radio));e.dispose()
if __name__=='__main__':unittest.main()
