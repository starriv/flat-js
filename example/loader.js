{const a=2147483648,b=A=>"number"==typeof A&&(0|A)===A&&0==(A&a),c=" is not defined",d=" is a constant";function run(p,s,A=0,e=[],r=void 0,o=[]){const t=new WeakSet;o={[0]:0,1:e,2:[r,...o,o.length],3:-1};t.add(o);const n=[o];let h=A;var f=()=>p[h++],u=(A,e=1)=>A[A.length-e];const E=new WeakMap;var i=(A,e,r,a)=>{E.has(A)||E.set(A,new Map);const o={[7]:r,8:a,9:void 0};E.get(A).set(e,o),Reflect.defineProperty(A,e,{configurable:!0,get:function(){if(o[7])throw new ReferenceError(e+c);return o[9]},set:function(A){if(o[7])throw new ReferenceError(e+c);if(o[8])throw new TypeError(e+d);o[9]=A}})},l=(A,e,r)=>{switch(r){case 3:case 2:return i(A,e,!0,!1);case 5:case 4:case 1:return i(A,e,!1,!1)}},w=(A,e)=>{const r=E.get(A);if(r)return r.get(e)};const B=new WeakMap;for(var g=(e,r)=>{for(let A=e[1].length-1;0<=A;A--)if(Reflect.has(e[1][A],r))return e[1][A];return null},k=(A,e)=>{if(t.has(A)){var r=g(A,e);if(r)return r[e];throw new ReferenceError(e+c)}return A[e]};0<=h&&h<p.length;){var v=f();const rA=n[n.length-1];switch(v){case 1:var Q=f();b(Q)?rA[2].push(Q):rA[2].push(s[Q^a]);break;case 13:rA[2].pop();break;case 14:rA[2].push(u(rA[2]));break;case 15:rA[2].push(rA);break;case 2:rA[2].push(null);break;case 3:rA[2].push(void 0);break;case 16:case 17:{var C=rA[2].pop(),Q=rA[2].pop();const aA=rA[2].pop();if(t.has(aA)){const oA=g(aA,Q);if(!oA)throw new ReferenceError(Q+c);oA[Q]=C}else aA[Q]=C;16===v?rA[2].push(C):rA[2].push(aA)}break;case 19:{var I=rA[2].pop(),R=rA[2].pop();const pA=rA[2].pop();Reflect.defineProperty(pA,R,{configurable:!0,enumerable:!0,writable:!0,value:I}),pA[R]=I,rA[2].push(pA)}break;case 20:R=rA[2].pop(),I=rA[2].pop();rA[2].push(k(I,R));break;case 18:var y=rA[2].pop(),D=rA[2].pop();for(let A=0;A<D;A++){var F=rA[2].pop(),P=rA[2].pop(),m=rA[2].pop();let e=!1;for(let A=y[1].length-1;0<=A;A--)if(Reflect.has(y[1][A],m)){e=!0;const sA=w(y[1][A],m);sA&&1&F&&(sA[7]=!1),rA[1][A][m]=P,sA&&2&F&&(sA[8]=!0);break}if(!e)throw new ReferenceError(m+c)}break;case 7:var G=rA[2].pop();h=G;break;case 6:var G=rA[2].pop(),N=rA[2].pop();G||(h=N);break;case 8:var N=rA[2].pop(),U=rA[2].pop();rA[2].push(N),N&&(h=U);break;case 9:var U=rA[2].pop(),K=rA[2].pop();rA[2].push(U),U||(h=K);break;case 10:{rA[2].pop();var M=rA[2].pop();const tA=[];for(let A=0;A<M;A++)tA.push({[0]:rA[2].pop(),6:rA[2].pop()});var T=rA[2].pop();const nA=[];for(let A=0;A<T;A++)nA.push(rA[2].pop());var W,_,j,X=rA[2].pop();const cA=[];for(let A=0;A<X;A++)cA.unshift(rA[2].pop());const r=rA[2].pop(),hA={};rA[1].push(hA);for(W of tA)l(hA,W[6],W[0]);for([_,j]of nA.entries())hA[j]=cA[_]}break;case 11:{var Y=rA[2].pop();const fA=[];for(let A=0;A<Y;A++)fA.push({[0]:rA[2].pop(),6:rA[2].pop()});var $,L={};rA[1].push(L);for($ of fA)l(L,$[6],$[0])}break;case 12:rA[1].pop();break;case 21:var K=u(rA[2],2),O=u(rA[2]);w(u(K[1]),O)[7]=!1;break;case 22:var O=u(rA[2],2),S=u(rA[2]);w(u(O[1]),S)[8]=!0;break;case 23:var q=rA[2].pop(),x=rA[2].pop(),S=rA[2].pop();rA[2].push(((A,e,r,a)=>{var o=[...A],e={[6]:e,0:r,10:a,1:o},r=function(...A){return run(p,s,a,o,this,A)};return B.set(r,e),r})(rA[1],S,q,x));break;case 26:{var z=rA[2].pop();const uA=[];for(let A=0;A<z;A++)uA.unshift(rA[2].pop());var q=rA[2].pop(),x=rA[2].pop(),H=k(x,q);let A=void 0;t.has(x)||(A=x),B.has(H)?(x={[0]:0,1:[...(q=B.get(H))[1]],3:h,2:[A,...uA,uA.length]},t.add(x),n.push(x),h=q[10]):rA[2].push(Reflect.apply(H,A,uA))}break;case 24:H=rA[2].pop();if(0<rA[2].length)throw new Error("bad return");for(;0!==u(n)[0];)n.pop();var J=u(n)[3];if(J<0)return H;n.pop(),u(n)[2].push(H),h=J;break;case 25:if(0<rA[2].length)throw new Error("bad return");for(;0!==u(n)[0];)n.pop();J=u(n)[3];if(J<0)return;n.pop(),u(n)[2].push(void 0),h=J;break;case 27:rA[2].push([]);break;case 28:rA[2].push({});break;case 32:case 33:case 31:case 41:case 42:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 30:case 29:{var V=rA[2].pop(),Z=rA[2].pop();const EA={[32]:(A,e)=>A&e,33:(A,e)=>A|e,31:(A,e)=>A^e,41:(A,e)=>A==e,42:(A,e)=>A===e,34:(A,e)=>e<A,35:(A,e)=>A>>e,36:(A,e)=>A>>>e,37:(A,e)=>e<=A,38:(A,e)=>A<e,39:(A,e)=>A<<e,40:(A,e)=>A<=e,29:(A,e)=>A+e,30:(A,e)=>A-e};var AA=EA[v](Z,V);rA[2].push(AA)}break;case 44:case 43:Z=rA[2].pop(),V=rA[2].pop();if(t.has(V)){const iA=g(V,Z);if(!iA)throw new ReferenceError(Z+c);var eA=iA[Z],AA=44===v?eA+1:eA-1;iA[Z]=AA,rA[2].push(eA)}else{const r=V;eA=r[Z],V=44===v?eA+1:eA-1;r[Z]=V,rA[2].push(eA)}break;case 45:break;case 5:case 4:case 0:throw new Error("Why are you here?");default:throw new Error("Unknown Op")}}}const e=["fetch","./bad-item.json","then","","t","json","_$_","Reflect","construct","Int32Array","Uint8Array","from","atob","p","buffer","globalThis","charCodeAt"],f=new Int32Array(Uint8Array.from(atob("AQAAAAAAAAABAAAAAAAAAAEAAAApAQAACgAAAA8AAAABAAAAAAAAgAEAAAABAACAAQAAAAEAAAAaAAAAAQAAAAIAAIABAAAAAwAAgAEAAAApAAAAAQAAANEAAAAXAAAAAQAAAAEAAAAaAAAAAQAAAAIAAIABAAAAAwAAgAEAAABAAAAAAQAAANEAAAAXAAAAAQAAAAEAAAAaAAAADQAAABkAAAABAAAABAAAgAEAAAABAAAAAQAAAAQAAIABAAAABAAAAAEAAAABAAAAAQAAANEAAAAKAAAADwAAAAEAAAAEAACAFAAAAAEAAAAFAACAAQAAAAAAAAAaAAAAGAAAAAEAAAAEAACAAQAAAAEAAAABAAAABAAAgAEAAAAEAAAAAQAAAAEAAAABAAAA0QAAAAoAAAAPAAAAAQAAAAYAAIAPAAAAAQAAAAcAAIAUAAAAAQAAAAgAAIAPAAAAAQAAAAkAAIAUAAAAGwAAAAEAAAAAAAAADwAAAAEAAAAKAACAFAAAAAEAAAALAACADwAAAAEAAAAMAACADwAAAAEAAAAEAACAFAAAAAEAAAANAACAFAAAAAEAAAABAAAAGgAAAAEAAAADAACAAQAAAKEAAAABAAAA0QAAABcAAAABAAAAAgAAABoAAAABAAAADgAAgBQAAAARAAAAAQAAAAIAAAAaAAAADwAAAAEAAAAEAACAFAAAAAEAAAAEAACAFAAAAAEAAAAAAAAAGwAAAAEAAAAAAAAADwAAAAEAAAAPAACAFAAAABEAAAABAAAAAQAAABwAAAABAAAABgAAgA8AAAABAAAABgAAgBQAAAATAAAAEQAAAAEAAAAEAAAAGgAAABgAAAABAAAABAAAgAEAAAABAAAAAQAAAAQAAIABAAAABAAAAAEAAAABAAAAAQAAANEAAAAKAAAADwAAAAEAAAAEAACAFAAAAAEAAAAQAACAAQAAAAAAAAABAAAAAQAAABoAAAAYAAAA"),A=>A.charCodeAt(0)).buffer);run(f,e,0,[globalThis,{_$_:run}])}
