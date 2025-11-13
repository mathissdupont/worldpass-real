import { useEffect, useState } from "react";

export default function AdminIssuers(){
  const [token, setToken] = useState(localStorage.getItem('wp_admin_token')||"");
  const [list, setList] = useState([]);
  const [loginErr, setLoginErr] = useState("");

  const login = async (e)=>{
    e.preventDefault();
    const username = e.target.user.value;
    const password = e.target.pass.value;
    const r = await fetch('/api/admin/login', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username, password})});
    if(r.ok){
      const data = await r.json();
      localStorage.setItem('wp_admin_token', data.token);
      setToken(data.token); setLoginErr("");
      fetchList(data.token);
    }else{
      setLoginErr("Login failed");
    }
  };

  const fetchList = async (tk)=>{
    const r = await fetch('/api/admin/issuers', {headers:{'x-token': tk || token}});
    if(r.ok){ setList(await r.json()); }
  };

  const approve = async (id)=>{
    const r = await fetch('/api/admin/issuers/approve', {method:'POST', headers:{
      'Content-Type':'application/json','x-token': token
    }, body: JSON.stringify({issuer_id:id})});
    if(r.ok){
      const {api_key} = await r.json();
      alert("API KEY (sadece 1 kez gösterilir):\n\n" + api_key);
      fetchList();
    }
  };

  useEffect(()=>{ if(token) fetchList(token); },[]);

  if(!token){
    return (
      <div className="max-w-md mx-auto bg-white p-4 rounded border space-y-3">
        <h2 className="font-semibold">Admin Login</h2>
        <form onSubmit={login} className="space-y-2">
          <input name="user" className="w-full border rounded p-2" placeholder="username (dev: admin)"/>
          <input name="pass" type="password" className="w-full border rounded p-2" placeholder="password (dev: admin123)"/>
          <button className="px-3 py-2 rounded bg-black text-white">Login</button>
        </form>
        {loginErr && <div className="text-xs text-rose-700">{loginErr}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Issuers</h2>
      {list.map(it=>(
        <div key={it.id} className="bg-white border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">{it.name} <span className="text-xs text-gray-500">({it.email})</span></div>
            <div className="text-xs text-gray-600">status: {it.status} | did: {it.did || '-'}</div>
          </div>
          <div className="flex gap-2">
            {it.status!=='approved' && <button onClick={()=>approve(it.id)} className="px-2 py-1 rounded border">Approve → API Key</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
