# مخطط تسلسلي — معركة Card Clash الجماعية

يوضح هذا المخطط تدفق البيانات المرجعي بين عميل المضيف وعميل الضيف وخادم WebSocket ومدير الغرف، بدءاً من إنشاء الغرفة وحتى نهاية المباراة أو استعادة الاتصال.

```mermaid
sequenceDiagram
    autonumber
    participant H as عميل المضيف
    participant S as خادم WebSocket
    participant R as مدير الغرف
    participant G as عميل الضيف

    H->>S: CREATE_ROOM { playerId, playerName }
    S->>R: createRoom(player)
    R-->>S: Room { id, status: waiting }
    S-->>H: ROOM_CREATED { roomId, reconnectToken }

    G->>S: JOIN_ROOM { roomId, playerId, playerName }
    S->>R: joinRoom(roomId, player)
    R-->>S: Room { player1, player2 }
    S-->>G: ROOM_JOINED { roomId, player1, player2 }
    S-->>H: PLAYER_JOINED { roomId, player }

    H->>S: MATCH_SETTINGS { rounds, withAbilities, rarityWeights }
    S->>R: setMatchSettings(roomId, settings)
    S-->>G: MATCH_SETTINGS_RECEIVED { settings }

    H->>S: ARRANGEMENT_READY { cardIds }
    S->>R: setPlayerCards + setPlayerReady
    S-->>G: OPPONENT_ARRANGEMENT_READY { 1/2 }

    G->>S: ARRANGEMENT_READY { cardIds }
    S->>R: setPlayerCards + setPlayerReady
    S-->>H: OPPONENT_ARRANGEMENT_READY { 2/2 }
    S-->>H: BATTLE_START { own cards, public opponent, scores }
    S-->>G: BATTLE_START { own cards, public opponent, scores }

    loop لكل جولة حتى انتهاء المباراة
        H->>S: REVEAL_CARD { roundIndex, cardId }
        S->>R: resolve trusted stored card
        S-->>G: OPPONENT_CARD_REVEALED { roundIndex }

        G->>S: REVEAL_CARD { roundIndex, cardId }
        S->>R: resolve trusted stored card
        R->>R: حسم العنصر/الهجوم وتحديث النقاط
        R-->>S: RoundResult
        S-->>H: ROUND_RESULT
        S-->>G: ROUND_RESULT

        alt انتهت المباراة
            S-->>H: GAME_OVER { winner, scores, roundHistory }
            S-->>G: GAME_OVER { winner, scores, roundHistory }
            S->>R: finishRoom ثم الحذف المؤجل
        else توجد جولة تالية
            Note over H,G: يحدّث العميلان العرض ثم يكشفان بطاقتي الجولة التالية
        end
    end

    opt انقطع اتصال أحد اللاعبين
        S-->>G: OPPONENT_DISCONNECTED { grace: 30 }
        Note over H,S: يعيد اللاعب المتصل فتح socket خلال 30 ثانية
        H->>S: RECONNECT { playerId, roomId, reconnectToken }
        S-->>H: RECONNECTED { new token, room, own cards, public opponent }
        S-->>G: OPPONENT_RECONNECTED { playerId }
    end
```

## نقاط التحكم الأساسية

| المرحلة | مسؤولية العميل | مسؤولية الخادم |
|---|---|---|
| الغرفة | حفظ `roomId` و`playerId` و`reconnectToken` في الذاكرة | إنشاء الغرفة، وربط الـsocket باللاعب، ومنع انضمام لاعب ثالث. |
| الإعدادات | يرسل المضيف إعدادات المباراة فقط | حفظ الإعدادات وتمريرها للضيف. |
| الجاهزية | إرسال معرّفات التشكيلة في `ARRANGEMENT_READY` مرة واحدة | حل المعرفات من كتالوج الخادم وبدء المعركة بعد جاهزية الطرفين. |
| الجولة | إرسال معرّف بطاقة الجولة ثم انتظار النتيجة | استخدام البطاقة المخزنة، وحسم الجولة، وعدم كشف بطاقات الخصم المستقبلية. |
| الانقطاع | عرض عداد المهلة وإرسال `RECONNECT` عند عودة الشبكة | الاحتفاظ بالغرفة 30 ثانية ثم إبلاغ الخصم أو حذف الغرفة. |

> يجب أن يعرض العميل نتيجة `ROUND_RESULT` القادمة من الخادم، لا نتيجة محلية مستقلة؛ الخادم هو المرجع للنقاط ولتحديد نهاية المباراة.
