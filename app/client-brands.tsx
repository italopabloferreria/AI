// Add official artwork to public/clients/ and an entry to this list.
export const clientBrands: {name:string;logo?:string;detail?:string;caption?:string}[] = [
  {name:'VCompany'},
  {name:'Cardiofitness',logo:'/clients/cardiofitness.jpeg'},
  {name:'Rita Trindade',logo:'/clients/rita-trindade.png'},
  {name:'Limpax',logo:'/clients/limpax.png'},
  {name:'UnB',logo:'/clients/unb.gif'},
  {name:'Seidler',logo:'/clients/seidler.png'},
  {name:'Alpha Clinic Vital'},
  {name:'Instituto Rita Trindade',logo:'/clients/instituto-rita.png'},
  {name:'Turma da Ritinha',logo:'/clients/ritinha.png'},
  {name:'Método Hálito Blindado',logo:'/clients/halito-blindado.png'},
  {name:'Twovortex',logo:'/clients/twovortex.png',caption:'TWOVORTEX'},
];
export default function ClientBrands(){return <section className="client-brands" aria-labelledby="client-brands-title">
  <div className="wrap"><div className="client-brands-heading"><div className="eyebrow">MARCAS & CONEXÕES</div><h2 id="client-brands-title">Boas conexões.<br/><span>Novas possibilidades.</span></h2><p>Tecnologia encontra pessoas. Ideias encontram caminho.</p></div>
    <ul className="client-brands-group">{clientBrands.map(brand=><li key={brand.name}>{brand.logo?<img src={brand.logo} alt={brand.name} width="180" height="72" loading="lazy"/>:<span className="client-brand-name">{brand.name}{brand.detail&&<small>{brand.detail}</small>}</span>}{brand.caption&&<span className="client-brand-caption">{brand.caption}</span>}</li>)}</ul>

  </div>
</section>;}
