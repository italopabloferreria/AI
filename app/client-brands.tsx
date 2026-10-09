import {useState} from 'react';

// Add official artwork to public/clients/ and an entry to this list.
export const clientBrands: {name:string;logo?:string;detail?:string;caption?:string}[] = [
  {name:'VCompany',logo:'/clients/vcompany.svg'},
  {name:'Cardiofitness',logo:'/clients/cardiofitness.svg'},
  {name:'Rita Trindade',logo:'/clients/rita-trindade.png'},
  {name:'Limpax',logo:'/clients/limpax.png'},
  {name:'UnB',logo:'/clients/unb.gif'},
  {name:'Seidler',logo:'/clients/seidler.png'},
  {name:'Alpha Clinic Vital'},
  {name:'Instituto Rita Trindade',logo:'/clients/instituto-rita.png'},
  {name:'Turma da Ritinha',logo:'/clients/ritinha.png'},
  {name:'Método Hálito Blindado',logo:'/clients/halito-blindado.png'},
  {name:'Twovortex',logo:'/clients/twovortex.png',caption:'TWOVORTEX'},
  {name:'Host Only Tecnologia',logo:'/clients/host-only.png'},
];
export default function ClientBrands(){const [paused,setPaused]=useState(false);const midpoint=Math.ceil(clientBrands.length/2);return <section className="client-brands" aria-labelledby="client-brands-title">
  <div className="wrap"><div className="client-brands-heading"><div className="eyebrow">MARCAS & CONEXÕES</div><h2 id="client-brands-title">Boas conexões.<br/><span>Novas possibilidades.</span></h2><p>Tecnologia encontra pessoas. Ideias encontram caminho.</p></div>
  </div>
  <div className={'client-brands-lanes'+(paused?' is-paused':'')}>{[clientBrands.slice(0,midpoint),clientBrands.slice(midpoint)].map((brands,row)=><div className="client-brands-lane" key={row}><div className="client-brands-track">{[0,1].map(copy=><ul className="client-brands-group" key={copy} aria-hidden={copy===1?true:undefined}>{brands.map(brand=><li key={brand.name}>{brand.logo?<img src={brand.logo} alt={brand.name} width="250" height="120" loading="lazy"/>:<span className="client-brand-name">{brand.name}{brand.detail&&<small>{brand.detail}</small>}</span>}{brand.caption&&<span className="client-brand-caption">{brand.caption}</span>}</li>)}</ul>)}</div></div>)}</div>
  <div className="client-brands-controls"><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'Retomar movimento':'Pausar movimento'}</button></div>
</section>;}
