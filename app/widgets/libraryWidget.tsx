'use client';

import { useEffect, useState } from 'react';

// components
import { displayFont, textFont } from '../components/fonts';

// firebase instances
import { auth, database, storage } from '../components/firebase';
import { deriveKeys, decryptData } from '../components/crypto';

// firebase methods
import { get, ref      as databaseRef } from 'firebase/database';
import { getBytes, ref as storageRef }  from 'firebase/storage';
import { signInAnonymously }            from 'firebase/auth';

// elements
import Indicator from '../elements/indicator';
import Card      from '../elements/card';
import Tapable   from '../elements/tapable';

// modals
import LibraryModal from '../modals/library';

// icons
import cactusIcon from '../../assets/icons/cactus.svg';
import   fireIcon from '../../assets/icons/fireThin.svg';

export default function LibraryWidget() {
  // declare states
  const [modal,   setModal]   = useState(false);
  const [skribos, setSkribos] = useState<Record<string, any> | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  
  useEffect(() => {
    const owned = localStorage.getItem('owned')?.split('/').filter(v => v != '');

    if (!owned) setSkribos({})

    signInAnonymously(auth).then(async ({ user }) => {
      if (!owned) return;

      let currCount: number = 0;

      let datas = owned.map(async id => {
        //if (!localStorage.getItem(id)) return;
        const docRef = databaseRef(database, `cards/${id}`);
        let data = await get(docRef).then(snap => snap.val()); 
  
        let keys = await deriveKeys(localStorage.getItem(id)!, data.importAlgorithm, data.encryptAlgorithm, new Uint8Array(data.salt))
        
        let decryptedReplies: string[] = [];
        if (data.replies) for (let reply of data.replies) {
          await decryptData(keys.encryptKey, new Uint8Array(data.iv), new Uint8Array(reply.text).buffer)
          .then(buffer => decryptedReplies.push({ ...reply, text: new TextDecoder().decode(buffer) }));
        }
        data.replies = decryptedReplies;
        data.id = id;

        if (data.encryptedText) data.text = await decryptData(keys.encryptKey, new Uint8Array(data.iv), new Uint8Array(data.encryptedText).buffer)
          .then(buffer => new TextDecoder().decode(buffer));

        await getBytes(storageRef(storage, `cards/${id}`)).then(async encrypted => {
          data.image = await decryptData(keys.encryptKey, new Uint8Array(data.iv), encrypted);
        }).catch(() => {});  
        
        currCount += data.replies.length;
        return [id, data];
      })

      let currSkribos: Record<string, any> = {};
      for (let value of datas) {
        let [id, data] = await value;
        currSkribos[id] = data;
      }

      setCounter(currCount);
      setSkribos(currSkribos)
    })
  }, [])

  let previews = !skribos ? [] : Object.keys(skribos).map(id => skribos[id].image ? 
    URL.createObjectURL(new Blob([skribos[id].image])) : null).filter(v => v != null) as string[]

  const loading = skribos == null;
  const empty = !(skribos && Object.keys(skribos).length);

  return <>
    <Card innerStyle={{ background: 'linear-gradient(0.25turn, #0001, #0000);', boxShadow: 'none', borderRadius: 16 }} effects={[{ background: '#333', mixBlendMode: 'overlay', borderRadius: 16 }, { backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', boxShadow: 'inset 0 0 0 1px #0001', borderRadius: 16 }]}>
      <Tapable onTap={() => setModal(true)} style={{ flexDirection: 'row', padding: 0 }}>
        <div style={{ flexDirection: 'column', width: '100%', height: 48, gap: 4, padding: 24, color: 'white'}}>
          <p style={{ fontFamily: displayFont, fontSize: 22, margin: 0, color: 'white' }}>Your Skribos</p>
          <p style={{ fontFamily: textFont, marginTop: loading ? 0 : -20, transition: 'all .3s cubic-bezier(.5, 0, 0, 1), opacity .15s', fontSize: 12, lineHeight: '16px', color: 'white', opacity: loading ? .75 : 0 }}>Loading</p>
          <p style={{ fontFamily: textFont, marginTop: loading ? 16 : 0, fontSize: 12, transition: 'all .3s cubic-bezier(.5, 0, 0, 1), opacity .15s .15s', lineHeight: loading ? 0 : '16px', color: 'white', opacity: !loading ? .75 : 0 }}>{ skribos != null ? (Object.keys(skribos).length ? `${counter} ${counter == 1 ? 'reply' : 'replies'}` : 'No skribos yet') : 'Loading' }</p>
        </div>

        <div style={{ alignItems: 'center', justifyContent: 'center', width: 144, height: '100%' }}>
          { [0, 1, 2].map(i => <img style={{ width: 38, height: 64, objectFit: 'cover', borderRadius: 4, boxShadow: 'var(--shadowNormal)', position: 'absolute', transform: `rotate(${previews[i] ? (previews.length == 1 && i == 0 ? 0 : -5+i*20) : -30}deg) scale(${previews[i] ? 1 : .7})`, zIndex: 3-i, opacity: previews[i] ? 1.3 - i * .30 : 0, transition: `.5s cubic-bezier(.75, 0, 0, 1) ${i*0.025}s` }} key={i} src={previews[i]} alt="Preview"/>) }
          <img style={{ height: 36, opacity: !loading && (empty || !previews.length) ? .25 : 0, transform: `scale(${!loading && (empty || !previews.length) ? 1 : .8})`, transitionDelay: '.15s', position: 'absolute' }} src={empty ? cactusIcon.src : fireIcon.src} alt="No image"/>
          <Indicator foreground={true} value={null} style={{ opacity: loading ? 1 : 0, transform: `scale(${loading ? 1 : .8})`, position: 'absolute' }}/>
        </div>
      </Tapable>
    </Card>

    <LibraryModal skribos={skribos} isOpen={modal} onClose={() => setModal(false)} />
  </>
}
