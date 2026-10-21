import { createHmac, randomInt, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function normalisePhone(input:string) {
  let phone=input.replace(/[^0-9]/g,'');
  if(phone.startsWith('00'))phone=phone.slice(2);
  if(phone.startsWith('0')&&phone.length===11)phone='44'+phone.slice(1);
  return phone;
}
function pepper(){const secret=process.env.ATTENDANCE_QR_SECRET;if(!secret||secret.length<32)throw new Error('PIN security is not configured');return secret;}
export function hashPin(pin:string,salt=randomBytes(16).toString('hex')){
  const keyed=createHmac('sha256',pepper()).update(pin).digest('hex');
  return salt+':'+scryptSync(keyed,Buffer.from(salt,'hex'),32).toString('hex');
}
export function verifyPin(pin:string,stored:string){
  const [salt,hash]=stored.split(':');
  if(!salt||!hash||!/^[0-9a-f]{32}$/i.test(salt)||!/^[0-9a-f]{64}$/i.test(hash))return false;
  const actual=Buffer.from(hashPin(pin,salt).split(':')[1],'hex');
  return timingSafeEqual(actual,Buffer.from(hash,'hex'));
}
export function generatePin(){return String(randomInt(0,1000000)).padStart(6,'0');}
