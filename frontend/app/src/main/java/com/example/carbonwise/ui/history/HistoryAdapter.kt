package com.example.carbonwise.ui.history

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R
import com.example.carbonwise.databinding.ItemProductBinding
import com.example.carbonwise.network.ProductItem
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HistoryAdapter(
    private val onProductClick: (String) -> Unit,
    private val onDeleteClick: (String) -> Unit
) : ListAdapter<ProductItem, HistoryAdapter.HistoryViewHolder>(HistoryDiffCallback()) {

    class HistoryViewHolder(private val binding: ItemProductBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(productItem: ProductItem, onProductClick: (String) -> Unit, onDeleteClick: (String) -> Unit) {
            val scanUuid = productItem.scan_uuid
            val productDetails = productItem.product
            val productId = productDetails.productId

            binding.textProductName.text = productDetails.productName ?: "Unknown Product"

            // Decode image asynchronously
            CoroutineScope(Dispatchers.IO).launch {
                val bitmap = decodeBase64ToBitmap(productDetails.productImage)
                withContext(Dispatchers.Main) {
                    if (bitmap != null) {
                        binding.imageProduct.setImageBitmap(bitmap)
                    } else {
                        binding.imageProduct.setImageResource(R.drawable.ic_placeholder)
                    }
                }
            }

            // Open product info when clicked
            binding.root.setOnClickListener {
                if (!productId.isNullOrEmpty()) {
                    onProductClick(productId)
                }
            }

            // Show delete button
            binding.btnDelete.visibility = View.VISIBLE
            binding.btnDelete.setOnClickListener {
                if (!scanUuid.isNullOrEmpty()) {
                    onDeleteClick(scanUuid)
                }
            }
        }

        private fun decodeBase64ToBitmap(base64String: String?): Bitmap? {
            return if (!base64String.isNullOrEmpty()) {
                try {
                    val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                } catch (e: IllegalArgumentException) {
                    null
                }
            } else null
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HistoryViewHolder {
        val binding = ItemProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return HistoryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HistoryViewHolder, position: Int) {
        holder.bind(getItem(position), onProductClick, onDeleteClick)
    }
}

class HistoryDiffCallback : DiffUtil.ItemCallback<ProductItem>() {
    override fun areItemsTheSame(oldItem: ProductItem, newItem: ProductItem): Boolean {
        return oldItem.scan_uuid == newItem.scan_uuid
    }

    override fun areContentsTheSame(oldItem: ProductItem, newItem: ProductItem): Boolean {
        return oldItem == newItem
    }
}
