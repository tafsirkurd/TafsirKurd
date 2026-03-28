package com.tafsirkurd.app

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.*
import org.json.JSONObject

private val ABg1    = Color(0xFF0E100E)
private val AAccent = Color(0xFF23BD69)
private val AT1     = Color(0xFFFFFFFF)
private val AT2     = Color(0x80FFFFFF.toInt())
private val AT3     = Color(0x47FFFFFF.toInt())
private val ASep    = Color(0x12FFFFFF.toInt())

// Note: Glance 1.1.1 FontFamily only supports CSS-style name strings.
// Custom R.font resources are not accessible from the widget (launcher process).
// Arabic text falls back to the system's default Arabic font.
private val ArabicFamily = FontFamily("serif")

private data class AyahData(
    val arabic: String,
    val tafsir: String,
    val surahName: String,
    val chapter: Int,
    val verse: Int,
    val showTafsir: Boolean,
    val showReference: Boolean
)

private fun loadAyahData(context: Context): AyahData? {
    val raw = WidgetDataStore.getString(context, "widgetAyahData") ?: return null
    return try {
        val obj = JSONObject(raw)
        AyahData(
            arabic        = obj.optString("arabic", ""),
            tafsir        = obj.optString("tafsir", ""),
            surahName     = obj.optString("surahName", ""),
            chapter       = obj.optInt("chapter", 0),
            verse         = obj.optInt("verse", 0),
            showTafsir    = obj.optBoolean("showTafsir", true),
            showReference = obj.optBoolean("showReference", true)
        )
    } catch (_: Exception) { null }
}

class AyahWidget : GlanceAppWidget() {

    companion object {
        private val MEDIUM = DpSize(220.dp, 110.dp)
        private val LARGE  = DpSize(220.dp, 220.dp)
    }

    override val sizeMode = SizeMode.Responsive(setOf(MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { AyahContent() }
    }

    @Composable
    private fun AyahContent() {
        val context = LocalContext.current
        val size    = LocalSize.current
        val data    = loadAyahData(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ABg1)
                .padding(0.dp)
        ) {
            if (data == null || data.arabic.isBlank()) {
                EmptyState()
            } else if (size.height < 200.dp) {
                MediumContent(data)
            } else {
                LargeContent(data)
            }
        }
    }

    @Composable
    private fun EmptyState() {
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier.fillMaxSize()
        ) {
            Text(
                text = "ئایەتێک هەڵبژێرە",
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(AT3),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            )
        }
    }

    @Composable
    private fun MediumContent(data: AyahData) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically,
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Text(
                text = data.arabic,
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(AT1),
                    fontSize = 18.sp,
                    fontFamily = ArabicFamily,
                    textAlign = TextAlign.Center
                ),
                maxLines = 3
            )
            if (data.showReference && data.chapter > 0) {
                Spacer(GlanceModifier.height(6.dp))
                Text(
                    text = "${data.surahName} ${data.chapter}:${data.verse}",
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(AT3),
                        fontSize = 11.sp,
                        textAlign = TextAlign.Center
                    )
                )
            }
        }
    }

    @Composable
    private fun LargeContent(data: AyahData) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.Top,
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            if (data.showReference && data.chapter > 0) {
                Text(
                    text = "${data.surahName} ${data.chapter}:${data.verse}",
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(AAccent),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(GlanceModifier.height(10.dp))
            }
            Text(
                text = data.arabic,
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(AT1),
                    fontSize = 22.sp,
                    fontFamily = ArabicFamily,
                    textAlign = TextAlign.Center
                ),
                maxLines = 5
            )
            if (data.showTafsir && data.tafsir.isNotBlank()) {
                Spacer(GlanceModifier.height(10.dp))
                // Separator line
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(ASep)
                ) {}
                Spacer(GlanceModifier.height(8.dp))
                Text(
                    text = data.tafsir,
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(AT2),
                        fontSize = 12.sp,
                        textAlign = TextAlign.End
                    ),
                    maxLines = 4
                )
            }
        }
    }
}

class AyahWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = AyahWidget()
}
