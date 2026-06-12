import { Header } from '@/components/layout/Header'

export const metadata = {
  title: 'Политика обработки персональных данных',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-section">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Политика обработки персональных данных
        </h1>
        <p className="text-text-muted text-sm mb-8">Последнее обновление: 1 января 2025 г.</p>

        <div className="space-y-8 text-text-secondary text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
              и защиты персональных данных пользователей сервиса доставки еды «Время есть»
              (далее — «Оператор»).
            </p>
            <p className="mt-2">
              Оператор: <span className="text-text-primary font-medium">[Полное наименование ИП / ООО]</span>,
              ОГРН <span className="text-text-primary font-medium">[ОГРН]</span>,
              ИНН <span className="text-text-primary font-medium">[ИНН]</span>,
              адрес: <span className="text-text-primary font-medium">[Юридический адрес]</span>.
            </p>
            <p className="mt-2">
              Используя сайт и оформляя заказ, вы соглашаетесь с условиями настоящей Политики.
              Если вы не согласны с её условиями, пожалуйста, воздержитесь от использования сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">2. Какие данные мы собираем</h2>
            <p>При оформлении заказа мы можем собирать следующие персональные данные:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Имя и фамилия</li>
              <li>Номер телефона</li>
              <li>Адрес электронной почты</li>
              <li>Адрес доставки</li>
              <li>Дата рождения (для предоставления именинной скидки)</li>
              <li>История заказов</li>
            </ul>
            <p className="mt-2">
              Мы также автоматически получаем технические данные: IP-адрес, тип браузера, данные
              cookie — исключительно в целях улучшения работы сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">3. Цели обработки данных</h2>
            <p>Ваши данные используются исключительно для:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Оформления и доставки заказов</li>
              <li>Связи с вами по вопросам заказа</li>
              <li>Начисления бонусов и предоставления персональных скидок</li>
              <li>Улучшения качества обслуживания</li>
              <li>Информирования об акциях и специальных предложениях (с вашего согласия)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">4. Хранение и защита данных</h2>
            <p>
              Мы принимаем технические и организационные меры для защиты ваших данных от
              несанкционированного доступа, изменения, раскрытия или уничтожения. Данные хранятся
              на защищённых серверах и не передаются третьим лицам, за исключением случаев,
              необходимых для исполнения заказа (например, службе доставки).
            </p>
            <p className="mt-2">
              Срок хранения персональных данных — не более 3 лет с момента последнего заказа,
              либо до момента отзыва согласия пользователем.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">5. Передача данных третьим лицам</h2>
            <p>
              Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих целях.
              Данные могут быть переданы только в следующих случаях:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>По требованию уполномоченных государственных органов в соответствии с законодательством РФ</li>
              <li>Курьерской службе — исключительно адрес и имя получателя для доставки заказа</li>
              <li>Платёжным системам — для обработки оплаты</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">6. Права пользователя</h2>
            <p>В соответствии с Федеральным законом № 152-ФЗ «О персональных данных» вы имеете право:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Получить информацию об обработке ваших данных</li>
              <li>Потребовать исправления неточных данных</li>
              <li>Отозвать согласие на обработку данных</li>
              <li>Потребовать удаления ваших данных</li>
            </ul>
            <p className="mt-2">
              Для реализации своих прав обратитесь к нам по адресу:{' '}
              <a href="mailto:[email@example.com]" className="text-brand hover:underline">
                [email@example.com]
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">7. Cookie</h2>
            <p>
              Наш сайт использует файлы cookie для корректной работы корзины, авторизации и
              аналитики посещаемости. Вы можете отключить cookie в настройках браузера, однако
              это может повлиять на работу некоторых функций сайта.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">8. Изменения Политики</h2>
            <p>
              Мы оставляем за собой право вносить изменения в настоящую Политику. Актуальная версия
              всегда доступна на этой странице. Продолжение использования сервиса после публикации
              изменений означает ваше согласие с обновлённой Политикой.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-2">9. Контакты</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь:
            </p>
            <ul className="mt-2 space-y-1">
              <li>Email: <a href="mailto:[email@example.com]" className="text-brand hover:underline">[email@example.com]</a></li>
              <li>Телефон: <span className="text-text-primary font-medium">[Номер телефона]</span></li>
              <li>Адрес: <span className="text-text-primary font-medium">[Почтовый адрес]</span></li>
            </ul>
          </section>

        </div>

        <a href="/" className="inline-flex items-center gap-2 mt-10 text-sm text-brand hover:underline">
          ← Вернуться в меню
        </a>
      </main>
    </div>
  )
}