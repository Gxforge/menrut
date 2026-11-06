import {test,expect} from '@playwright/test';
test('Directorio honesto y diseño sin desbordamiento',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Hay un camino. Hay quien lo lleva.'})).toBeVisible();
 await expect(page.getByText('Los primeros caminos están por conectar')).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Provincia',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('Registro y recuperación con formularios conectados',async({page})=>{
 await page.goto('/cuenta?registro=1');
 await expect(page.getByRole('heading',{name:'Tu camino empieza aquí.'})).toBeVisible();
 await expect(page.getByLabel('Correo electrónico')).toBeVisible();
 await page.getByRole('button',{name:'Volver a iniciar sesión'}).click();
 await page.getByRole('button',{name:'Olvidé mi contraseña'}).click();
 await expect(page.getByRole('heading',{name:'Recupera tu acceso.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('Enlace de privacidad y estado del servicio',async({page})=>{
 await page.goto('/informacion');await expect(page.getByRole('heading',{name:'Servicio en desarrollo'})).toBeVisible();
});
test('Sin red nunca confirma operaciones',async({page,context})=>{
 await page.goto('/');await expect(page.getByText('Los primeros caminos están por conectar')).toBeVisible();
 await context.setOffline(true);await expect(page.getByRole('status').filter({hasText:'Sin conexión.'})).toBeVisible();
 await context.setOffline(false);
});
